import { Types } from "mongoose";
import { findAssessmentById } from "../repository/assessment.repository.js";
import {
  createCarePlan,
  findCarePlanById,
  listCarePlansForDoctor,
  listCarePlansForPatient,
  updateCarePlanTask,
  type TaskPatch,
} from "../repository/care-plan.repository.js";
import { findReviewsByAssessment } from "../repository/review.repository.js";
import { ConflictError, ForbiddenError, NotFoundError } from "../utils/api-error.js";
import { presentCarePlan } from "../utils/clinical-mappers.js";
import { buildPagination } from "../utils/pagination.js";
import type { CreateCarePlanInput } from "../validators/care-plan.validator.js";
import { recordAudit, type RequestContext } from "./audit.service.js";
import { assertVerifiedDoctor } from "./doctor-access.service.js";
import { loadNames } from "./names.service.js";
import type { Actor } from "./patient.service.js";
import type { CarePlanEntity } from "../models/care-plan.model.js";

const view = async (plan: CarePlanEntity, includePatient: boolean) => {
  const names = await loadNames([plan.doctorId, plan.patientId]);
  return presentCarePlan(plan, names, { includePatient });
};

export const createPlanForDoctor = async (
  doctorId: string,
  input: CreateCarePlanInput,
  ctx: RequestContext,
) => {
  const a = await findAssessmentById(input.assessmentId);
  if (!a) throw new NotFoundError("Assessment not found");

  // Only a doctor who has submitted a review on this case can plan its care.
  const reviews = await findReviewsByAssessment(a._id);
  if (!reviews.some((r) => String(r.doctorId) === doctorId)) {
    throw new ForbiddenError(
      "Only a doctor who has reviewed this assessment can create its care plan.",
      "NOT_REVIEWING_DOCTOR",
    );
  }

  let plan: CarePlanEntity;
  try {
    plan = await createCarePlan({
      patientId: a.patientId,
      doctorId: new Types.ObjectId(doctorId),
      assessmentId: a._id,
      title: input.title,
      ...(input.summary ? { summary: input.summary } : {}),
      tasks: input.tasks.map((t) => ({
        _id: new Types.ObjectId(),
        title: t.title,
        type: t.type,
        status: "pending" as const,
        ...(t.description ? { description: t.description } : {}),
        ...(t.dueDate ? { dueDate: t.dueDate } : {}),
      })),
      referrals: input.referrals,
      ...(input.followUpDate ? { followUpDate: input.followUpDate } : {}),
    });
  } catch (error) {
    if ((error as { code?: unknown }).code === 11000) {
      throw new ConflictError(
        "A care plan already exists for this assessment.",
        "CARE_PLAN_EXISTS",
      );
    }
    throw error;
  }

  await recordAudit(
    {
      actor: { userId: doctorId, role: "doctor" },
      action: "careplan.create",
      resourceType: "care_plan",
      resourceId: String(plan._id),
      outcome: "success",
      metadata: { tasks: plan.tasks.length, referrals: plan.referrals.length },
    },
    ctx,
  );
  return view(plan, true);
};

export const listCarePlans = async (
  actor: Actor,
  query: { assessmentId?: string | undefined; page: number; limit: number },
) => {
  const { page, limit } = query;
  if (actor.role === "doctor") await assertVerifiedDoctor(actor.userId);

  const { items, total } =
    actor.role === "patient"
      ? await listCarePlansForPatient(actor.userId, page, limit)
      : await listCarePlansForDoctor(actor.userId, page, limit);

  const filtered = query.assessmentId
    ? items.filter((p) => String(p.assessmentId) === query.assessmentId)
    : items;
  const names = await loadNames(filtered.flatMap((p) => [p.doctorId, p.patientId]));

  return {
    items: filtered.map((p) => presentCarePlan(p, names, { includePatient: actor.role === "doctor" })),
    pagination: buildPagination(page, limit, query.assessmentId ? filtered.length : total),
  };
};

const canAccess = (actor: Actor, plan: CarePlanEntity): boolean =>
  actor.role === "patient"
    ? String(plan.patientId) === actor.userId
    : String(plan.doctorId) === actor.userId;

export const getCarePlan = async (actor: Actor, id: string) => {
  if (actor.role === "doctor") await assertVerifiedDoctor(actor.userId);
  const plan = await findCarePlanById(id);
  // Not-yours and not-found look identical.
  if (!plan || !canAccess(actor, plan)) throw new NotFoundError("Care plan not found");
  return view(plan, actor.role === "doctor");
};

export const updateTask = async (
  actor: Actor,
  planId: string,
  taskId: string,
  patch: TaskPatch,
  ctx: RequestContext,
) => {
  if (actor.role === "doctor") await assertVerifiedDoctor(actor.userId);
  const plan = await findCarePlanById(planId);
  if (!plan || !canAccess(actor, plan)) throw new NotFoundError("Care plan not found");

  const updated = await updateCarePlanTask(planId, taskId, patch);
  if (!updated) throw new NotFoundError("Task not found");

  await recordAudit(
    {
      actor,
      action: "careplan.task.update",
      resourceType: "care_plan",
      resourceId: planId,
      outcome: "success",
      metadata: { taskId, fields: Object.keys(patch).filter((k) => patch[k as keyof TaskPatch] !== undefined) },
    },
    ctx,
  );
  return view(updated, actor.role === "doctor");
};
