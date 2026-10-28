import type { Types } from "mongoose";
import { PRIORITY_RANK, type Priority } from "../constants/clinical.js";
import type { AssessmentEntity } from "../models/assessment.model.js";
import { getOrCreatePatientProfile } from "../repository/patient-profile.repository.js";
import {
  beginAiRetry,
  claimAssessment,
  createAssessment,
  findAssessmentById,
  findAssessmentsByIds,
  listAssessmentsForDoctor,
  listAssessmentsForPatient,
  listReviewQueue,
  writeAiOutcome,
} from "../repository/assessment.repository.js";
import { findCarePlanByAssessment } from "../repository/care-plan.repository.js";
import { findReviewsByAssessment, findReviewsByAssessmentIds } from "../repository/review.repository.js";
import {
  findAssignedAssessmentIds,
  findSecondOpinionByAssessment,
} from "../repository/second-opinion.repository.js";
import { ConflictError, ForbiddenError, NotFoundError } from "../utils/api-error.js";
import {
  MAX_AI_ATTEMPTS,
  presentDoctorAssessment,
  presentDoctorSummary,
  presentPatientAssessment,
  presentPatientSummary,
  presentQueueItem,
  type DoctorRole,
} from "../utils/clinical-mappers.js";
import { buildPagination } from "../utils/pagination.js";
import type { CreateAssessmentInput } from "../validators/assessment.validator.js";
import type { AiInput } from "./ai/ai-types.js";
import { runAiAssessment, type AiRunResult } from "./ai/ai-assessment.service.js";
import { recordAudit, type RequestContext } from "./audit.service.js";
import { assertVerifiedDoctor } from "./doctor-access.service.js";
import { loadNames } from "./names.service.js";
import type { Actor } from "./patient.service.js";
import { evaluateRedFlags } from "./safety.service.js";

const ageInYears = (dob: Date, now: Date = new Date()): number => {
  let age = now.getUTCFullYear() - dob.getUTCFullYear();
  const monthDiff = now.getUTCMonth() - dob.getUTCMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getUTCDate() < dob.getUTCDate())) age -= 1;
  return Math.max(0, age);
};

const toAiInput = (a: AssessmentEntity): AiInput => ({
  symptoms: a.symptoms,
  description: a.description,
  patient: {
    ageYears: a.profileSnapshot.ageYears,
    gender: a.profileSnapshot.gender,
    allergies: a.profileSnapshot.allergies,
    currentMedications: a.profileSnapshot.currentMedications,
    conditions: a.profileSnapshot.conditions,
  },
});

const persistAiRun = (id: Types.ObjectId, run: AiRunResult) =>
  writeAiOutcome(
    id,
    run.status === "completed"
      ? {
          status: "completed",
          mode: run.mode,
          model: run.model,
          generatedAt: run.generatedAt,
          result: { ...run.result },
        }
      : { status: "unavailable", mode: run.mode, model: run.model, error: run.error },
  );

// ---- views --------------------------------------------------------------
const patientView = async (a: AssessmentEntity) => {
  const [reviews, secondOpinion, plan] = await Promise.all([
    findReviewsByAssessment(a._id),
    findSecondOpinionByAssessment(a._id),
    findCarePlanByAssessment(a._id),
  ]);
  const names = await loadNames([
    a.assignedDoctorId,
    secondOpinion?.assignedDoctorId,
    ...reviews.map((r) => r.doctorId),
  ]);
  return presentPatientAssessment(a, {
    reviews,
    secondOpinion,
    names,
    carePlanId: plan ? String(plan._id) : null,
  });
};

/** Works out whether `doctorId` may open this assessment, and in which role. */
const resolveDoctorRole = async (
  a: AssessmentEntity,
  doctorId: string,
): Promise<DoctorRole | null> => {
  if (a.assignedDoctorId && String(a.assignedDoctorId) === doctorId) return "primary";
  const so = await findSecondOpinionByAssessment(a._id);
  if (so?.assignedDoctorId && String(so.assignedDoctorId) === doctorId) return "second_opinion";
  return null;
};

export const doctorView = async (a: AssessmentEntity, doctorId: string, role: DoctorRole) => {
  const [reviews, secondOpinion, plan] = await Promise.all([
    findReviewsByAssessment(a._id),
    findSecondOpinionByAssessment(a._id),
    findCarePlanByAssessment(a._id),
  ]);
  // A second-opinion doctor must form an independent view first: earlier
  // findings stay hidden until they have submitted their own review.
  const blind = role === "second_opinion" && !reviews.some((r) => String(r.doctorId) === doctorId);
  const names = await loadNames([
    a.patientId,
    a.assignedDoctorId,
    secondOpinion?.assignedDoctorId,
    ...reviews.map((r) => r.doctorId),
  ]);
  return presentDoctorAssessment(a, {
    role,
    reviews: blind ? [] : reviews,
    secondOpinion,
    names,
    carePlanId: plan ? String(plan._id) : null,
    blind,
  });
};

// ---- create -------------------------------------------------------------
export const createAssessmentForPatient = async (
  patientId: string,
  input: CreateAssessmentInput,
  ctx: RequestContext,
) => {
  const profile = await getOrCreatePatientProfile(patientId);
  const consented = profile?.consents?.some((c) => c.type === "ai_assessment" && c.granted);
  if (!profile || !consented) {
    throw new ForbiddenError(
      "Turn on AI-assisted assessments in your health profile before submitting symptoms.",
      "CONSENT_REQUIRED",
    );
  }

  const ageYears = profile.dateOfBirth ? ageInYears(profile.dateOfBirth) : undefined;

  // 1. Safety pathway first. Rule-based, independent of the AI.
  const redFlags = evaluateRedFlags({
    symptoms: input.symptoms,
    description: input.description,
    ageYears,
  });
  const priority: Priority =
    redFlags.level === "emergency" ? "emergency" : redFlags.level === "urgent" ? "urgent" : "routine";
  const skipAi = redFlags.level === "emergency";

  const created = await createAssessment({
    patientId: profile.userId,
    symptoms: input.symptoms,
    ...(input.description ? { description: input.description } : {}),
    profileSnapshot: {
      ...(ageYears !== undefined ? { ageYears } : {}),
      ...(profile.gender ? { gender: profile.gender } : {}),
      allergies: profile.allergies ?? [],
      currentMedications: (profile.currentMedications ?? []).map((m) => m.name),
      conditions: (profile.medicalHistory ?? []).map((h) => h.condition),
    },
    redFlags,
    priority,
    priorityRank: PRIORITY_RANK[priority],
    ai: skipAi
      ? {
          status: "not_requested",
          attempts: 0,
          note: "AI was not run because urgent warning signs were detected. A doctor will review this case as a priority.",
        }
      : { status: "pending", attempts: 1 },
    status: "awaiting_review",
  });

  await recordAudit(
    {
      actor: { userId: patientId, role: "patient" },
      action: "assessment.create",
      resourceType: "assessment",
      resourceId: String(created._id),
      outcome: "success",
      metadata: { priority, safetyLevel: redFlags.level }, // never symptom text
    },
    ctx,
  );

  let current = created;
  if (!skipAi) {
    // 2. AI second. A failure never loses the case: it stays in the doctor queue.
    const run = await runAiAssessment(toAiInput(created));
    current = (await persistAiRun(created._id, run)) ?? created;
    await recordAudit(
      {
        actor: { userId: patientId, role: "patient" },
        action: "assessment.ai",
        resourceType: "assessment",
        resourceId: String(created._id),
        outcome: run.status === "completed" ? "success" : "failure",
        metadata:
          run.status === "completed"
            ? { mode: run.mode, model: run.model }
            : { code: run.error.code, mode: run.mode ?? null },
      },
      ctx,
    );
  }
  return patientView(current);
};

// ---- retry --------------------------------------------------------------
export const retryAiForPatient = async (
  patientId: string,
  assessmentId: string,
  ctx: RequestContext,
) => {
  const existing = await findAssessmentById(assessmentId);
  if (!existing || String(existing.patientId) !== patientId) {
    throw new NotFoundError("Assessment not found");
  }

  const locked = await beginAiRetry(assessmentId, MAX_AI_ATTEMPTS);
  if (!locked) {
    throw new ConflictError(
      "AI can't be retried for this assessment right now.",
      "AI_RETRY_NOT_ALLOWED",
    );
  }

  const run = await runAiAssessment(toAiInput(locked));
  const updated = (await persistAiRun(locked._id, run)) ?? locked;
  await recordAudit(
    {
      actor: { userId: patientId, role: "patient" },
      action: "assessment.ai.retry",
      resourceType: "assessment",
      resourceId: assessmentId,
      outcome: run.status === "completed" ? "success" : "failure",
      metadata: { attempt: locked.ai.attempts },
    },
    ctx,
  );
  return patientView(updated);
};

// ---- read ---------------------------------------------------------------
export const getAssessment = async (actor: Actor, id: string, ctx: RequestContext) => {
  const a = await findAssessmentById(id);

  if (actor.role === "patient") {
    // Not-yours and not-found are indistinguishable (no existence leak).
    if (!a || String(a.patientId) !== actor.userId) throw new NotFoundError("Assessment not found");
    return patientView(a);
  }

  await assertVerifiedDoctor(actor.userId);
  const role = a ? await resolveDoctorRole(a, actor.userId) : null;
  if (!a || !role) {
    await recordAudit(
      { actor, action: "assessment.view", resourceType: "assessment", resourceId: id, outcome: "denied" },
      ctx,
    );
    throw new NotFoundError("Assessment not found");
  }

  await recordAudit(
    { actor, action: "assessment.view", resourceType: "assessment", resourceId: id, outcome: "success" },
    ctx,
  );
  return doctorView(a, actor.userId, role);
};

export const listAssessments = async (
  actor: Actor,
  query: { scope?: "queue" | "mine" | undefined; page: number; limit: number },
) => {
  const { page, limit } = query;

  if (actor.role === "patient") {
    const { items, total } = await listAssessmentsForPatient(actor.userId, page, limit);
    const reviews = await findReviewsByAssessmentIds(items.map((a) => a._id));
    const counts = new Map<string, number>();
    for (const r of reviews) counts.set(String(r.assessmentId), (counts.get(String(r.assessmentId)) ?? 0) + 1);
    return {
      items: items.map((a) => presentPatientSummary(a, counts.get(String(a._id)) ?? 0)),
      pagination: buildPagination(page, limit, total),
    };
  }

  await assertVerifiedDoctor(actor.userId);

  if ((query.scope ?? "queue") === "queue") {
    const { items, total } = await listReviewQueue(page, limit);
    return {
      items: items.map((a) => presentQueueItem(a)),
      pagination: buildPagination(page, limit, total),
    };
  }

  const secondOpinionIds = await findAssignedAssessmentIds(actor.userId);
  const { items, total } = await listAssessmentsForDoctor(actor.userId, secondOpinionIds, page, limit);
  const names = await loadNames(items.map((a) => a.patientId));
  return {
    items: items.map((a) =>
      presentDoctorSummary(
        a,
        a.assignedDoctorId && String(a.assignedDoctorId) === actor.userId ? "primary" : "second_opinion",
        names,
      ),
    ),
    pagination: buildPagination(page, limit, total),
  };
};

// ---- claim --------------------------------------------------------------
export const claimForDoctor = async (doctorId: string, id: string, ctx: RequestContext) => {
  const claimed = await claimAssessment(id, doctorId);
  if (!claimed) {
    const exists = await findAssessmentById(id);
    if (!exists) throw new NotFoundError("Assessment not found");
    await recordAudit(
      { actor: { userId: doctorId, role: "doctor" }, action: "assessment.claim", resourceType: "assessment", resourceId: id, outcome: "failure" },
      ctx,
    );
    throw new ConflictError(
      "This case has already been claimed or is not awaiting review.",
      "ALREADY_CLAIMED",
    );
  }
  await recordAudit(
    { actor: { userId: doctorId, role: "doctor" }, action: "assessment.claim", resourceType: "assessment", resourceId: id, outcome: "success" },
    ctx,
  );
  return doctorView(claimed, doctorId, "primary");
};

/** Used by other services that need to re-read the doctor's view after a change. */
export const refreshedDoctorView = async (id: string, doctorId: string) => {
  const a = await findAssessmentById(id);
  if (!a) throw new NotFoundError("Assessment not found");
  const role = await resolveDoctorRole(a, doctorId);
  if (!role) throw new NotFoundError("Assessment not found");
  return doctorView(a, doctorId, role);
};

export const loadAssessmentsByIds = findAssessmentsByIds;
