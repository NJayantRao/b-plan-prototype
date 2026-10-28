import type { Types } from "mongoose";
import type { PlanStatus, TaskStatus } from "../constants/clinical.js";
import { CarePlan, type CarePlanEntity } from "../models/care-plan.model.js";

type Id = string | Types.ObjectId;

export type NewCarePlan = Omit<
  CarePlanEntity,
  "_id" | "createdAt" | "updatedAt" | "progressStatus"
>;

export const createCarePlan = async (data: NewCarePlan): Promise<CarePlanEntity> => {
  const doc = await CarePlan.create(data);
  return doc.toObject() as CarePlanEntity;
};

export const findCarePlanById = (id: Id) => CarePlan.findById(id).lean<CarePlanEntity>().exec();

export const findCarePlanByAssessment = (assessmentId: Id) =>
  CarePlan.findOne({ assessmentId }).lean<CarePlanEntity>().exec();

export const findCarePlansByAssessmentIds = (ids: Types.ObjectId[]) =>
  CarePlan.find({ assessmentId: { $in: ids } }).lean<CarePlanEntity[]>().exec();

const paged = async (filter: Record<string, unknown>, page: number, limit: number) => {
  const [items, total] = await Promise.all([
    CarePlan.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean<CarePlanEntity[]>()
      .exec(),
    CarePlan.countDocuments(filter).exec(),
  ]);
  return { items, total };
};

export const listCarePlansForPatient = (patientId: Id, page: number, limit: number) =>
  paged({ patientId }, page, limit);

export const listCarePlansForDoctor = (doctorId: Id, page: number, limit: number) =>
  paged({ doctorId }, page, limit);

export interface TaskPatch {
  status?: TaskStatus | undefined;
  notes?: string | undefined;
  title?: string | undefined;
  description?: string | undefined;
  dueDate?: Date | undefined;
}

/**
 * Updates one task and recomputes the plan's progress. Loads and saves the
 * document (rather than using positional operators) so it behaves the same on
 * every MongoDB-compatible server. Returns null if the plan/task is missing.
 */
export const updateCarePlanTask = async (
  planId: Id,
  taskId: Id,
  patch: TaskPatch,
): Promise<CarePlanEntity | null> => {
  const plan = await CarePlan.findById(planId);
  if (!plan) return null;
  const task = plan.tasks.find((t) => String(t._id) === String(taskId));
  if (!task) return null;

  if (patch.title !== undefined) task.title = patch.title;
  if (patch.description !== undefined) task.description = patch.description;
  if (patch.dueDate !== undefined) task.dueDate = patch.dueDate;
  if (patch.notes !== undefined) task.notes = patch.notes;
  if (patch.status !== undefined) {
    task.status = patch.status;
    if (patch.status === "completed") task.completedAt = new Date();
    // Assigning undefined unsets the field on a Mongoose subdocument.
    else (task as { completedAt?: Date | undefined }).completedAt = undefined;
  }

  const allDone =
    plan.tasks.length > 0 &&
    plan.tasks.every((t) => t.status === "completed" || t.status === "skipped");
  const next: PlanStatus = allDone ? "completed" : "active";
  if (plan.progressStatus !== "cancelled") plan.progressStatus = next;

  await plan.save();
  return plan.toObject() as CarePlanEntity;
};
