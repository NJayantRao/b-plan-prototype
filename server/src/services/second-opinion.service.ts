import { Types } from "mongoose";
import {
  findAssessmentById,
  findAssessmentsByIds,
  findPrimaryAssessmentIdsForDoctor,
  transitionAssessment,
} from "../repository/assessment.repository.js";
import {
  claimSecondOpinion,
  createSecondOpinion,
  findSecondOpinionById,
  listAvailableSecondOpinions,
  listSecondOpinionsAssignedTo,
  listSecondOpinionsForPatient,
} from "../repository/second-opinion.repository.js";
import type { SecondOpinionRequestEntity } from "../models/second-opinion-request.model.js";
import { ConflictError, ForbiddenError, NotFoundError } from "../utils/api-error.js";
import {
  presentQueueItem,
  presentSecondOpinion,
  type NameMap,
} from "../utils/clinical-mappers.js";
import { buildPagination } from "../utils/pagination.js";
import { recordAudit, type RequestContext } from "./audit.service.js";
import { assertVerifiedDoctor } from "./doctor-access.service.js";
import { loadNames } from "./names.service.js";
import type { Actor } from "./patient.service.js";

const isDuplicateKey = (error: unknown): boolean =>
  error instanceof Error && (error as { code?: unknown }).code === 11000;

export const requestSecondOpinion = async (
  actor: Actor,
  assessmentId: string,
  reason: string | undefined,
  ctx: RequestContext,
) => {
  const a = await findAssessmentById(assessmentId);

  const isOwner = a !== null && actor.role === "patient" && String(a.patientId) === actor.userId;
  const isPrimaryDoctor =
    a !== null &&
    actor.role === "doctor" &&
    a.assignedDoctorId !== undefined &&
    String(a.assignedDoctorId) === actor.userId;
  if (actor.role === "doctor") await assertVerifiedDoctor(actor.userId);
  if (!a || (!isOwner && !isPrimaryDoctor)) throw new NotFoundError("Assessment not found");

  if (a.status !== "reviewed") {
    throw new ConflictError(
      "A second opinion can be requested once the first doctor's review has been submitted.",
      "SECOND_OPINION_NOT_READY",
    );
  }

  let request;
  try {
    request = await createSecondOpinion({
      assessmentId: a._id,
      patientId: a.patientId,
      requestedBy: new Types.ObjectId(actor.userId),
      requestedByRole: actor.role === "doctor" ? "doctor" : "patient",
      reason,
    });
  } catch (error) {
    if (isDuplicateKey(error)) {
      throw new ConflictError(
        "A second opinion has already been requested for this assessment.",
        "SECOND_OPINION_EXISTS",
      );
    }
    throw error;
  }

  await transitionAssessment(a._id, "reviewed", "second_opinion");
  await recordAudit(
    {
      actor,
      action: "secondopinion.request",
      resourceType: "assessment",
      resourceId: assessmentId,
      outcome: "success",
      metadata: { requestedByRole: request.requestedByRole },
    },
    ctx,
  );

  const names = await loadNames([]);
  return presentSecondOpinion(request, names);
};

const itemFor = (
  so: SecondOpinionRequestEntity,
  assessment: Awaited<ReturnType<typeof findAssessmentsByIds>>[number] | undefined,
  names: NameMap,
) => ({
  ...presentSecondOpinion(so, names),
  ...(assessment
    ? {
        assessment: {
          priority: assessment.priority,
          symptoms: assessment.symptoms.map((s) => ({ name: s.name, severity: s.severity })),
        },
      }
    : {}),
});

export const listSecondOpinions = async (
  actor: Actor,
  query: { scope?: "available" | "mine" | undefined; page: number; limit: number },
) => {
  const { page, limit } = query;

  if (actor.role === "patient") {
    const { items, total } = await listSecondOpinionsForPatient(actor.userId, page, limit);
    const [assessments, names] = await Promise.all([
      findAssessmentsByIds(items.map((i) => i.assessmentId)),
      loadNames(items.map((i) => i.assignedDoctorId)),
    ]);
    const byId = new Map(assessments.map((a) => [String(a._id), a]));
    return {
      items: items.map((i) => itemFor(i, byId.get(String(i.assessmentId)), names)),
      pagination: buildPagination(page, limit, total),
    };
  }

  await assertVerifiedDoctor(actor.userId);

  if ((query.scope ?? "available") === "available") {
    const mine = await findPrimaryAssessmentIdsForDoctor(actor.userId);
    const { items, total } = await listAvailableSecondOpinions(mine, page, limit);
    const assessments = await findAssessmentsByIds(items.map((i) => i.assessmentId));
    const byId = new Map(assessments.map((a) => [String(a._id), a]));
    return {
      // Queue previews contain no patient identity and no earlier findings.
      items: items.flatMap((so) => {
        const a = byId.get(String(so.assessmentId));
        return a ? [presentQueueItem(a, { secondOpinion: so })] : [];
      }),
      pagination: buildPagination(page, limit, total),
    };
  }

  const { items, total } = await listSecondOpinionsAssignedTo(actor.userId, page, limit);
  const [assessments, names] = await Promise.all([
    findAssessmentsByIds(items.map((i) => i.assessmentId)),
    loadNames(items.map((i) => i.assignedDoctorId)),
  ]);
  const byId = new Map(assessments.map((a) => [String(a._id), a]));
  return {
    items: items.map((i) => itemFor(i, byId.get(String(i.assessmentId)), names)),
    pagination: buildPagination(page, limit, total),
  };
};

export const claimSecondOpinionForDoctor = async (
  doctorId: string,
  secondOpinionId: string,
  ctx: RequestContext,
) => {
  const so = await findSecondOpinionById(secondOpinionId);
  if (!so) throw new NotFoundError("Second opinion request not found");

  const a = await findAssessmentById(so.assessmentId);
  if (a?.assignedDoctorId && String(a.assignedDoctorId) === doctorId) {
    throw new ForbiddenError(
      "You reviewed this case first, so you can't give the second opinion.",
      "SECOND_OPINION_CONFLICT",
    );
  }

  // Atomic: only one doctor can take it.
  const claimed = await claimSecondOpinion(secondOpinionId, doctorId);
  if (!claimed) {
    throw new ConflictError(
      "This second opinion has already been taken.",
      "ALREADY_CLAIMED",
    );
  }

  await recordAudit(
    {
      actor: { userId: doctorId, role: "doctor" },
      action: "secondopinion.claim",
      resourceType: "assessment",
      resourceId: String(so.assessmentId),
      outcome: "success",
    },
    ctx,
  );
  const names = await loadNames([claimed.assignedDoctorId]);
  return presentSecondOpinion(claimed, names);
};
