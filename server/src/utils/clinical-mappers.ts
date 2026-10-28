import type { Types } from "mongoose";
import type { AssessmentEntity } from "../models/assessment.model.js";
import type { AssessmentReviewEntity } from "../models/assessment-review.model.js";
import type { CarePlanEntity } from "../models/care-plan.model.js";
import type { SecondOpinionRequestEntity } from "../models/second-opinion-request.model.js";
import type { UserEntity } from "../models/user.model.js";

export interface PersonRef {
  id: string;
  name: string;
}

export type NameMap = Map<string, PersonRef>;

export const buildNameMap = (users: UserEntity[]): NameMap =>
  new Map(
    users.map((u) => [
      String(u._id),
      { id: String(u._id), name: `${u.firstName} ${u.lastName}`.trim() },
    ]),
  );

const person = (names: NameMap, id: Types.ObjectId | string | undefined): PersonRef | null =>
  id ? (names.get(String(id)) ?? { id: String(id), name: "Unknown" }) : null;

export const MAX_AI_ATTEMPTS = 5;

export const presentSafety = (a: AssessmentEntity) => ({
  level: a.redFlags.level,
  matches: a.redFlags.matches,
  advice: a.redFlags.advice,
  rulesVersion: a.redFlags.rulesVersion,
  /** False until clinicians have reviewed the rule list. Shown to users. */
  clinicallyReviewed: a.redFlags.clinicallyReviewed,
  evaluatedAt: a.redFlags.evaluatedAt,
});

export const presentAi = (a: AssessmentEntity) => ({
  status: a.ai.status,
  /** "demo" means synthetic, deterministic output: not real AI. */
  mode: a.ai.mode ?? null,
  model: a.ai.model ?? null,
  generatedAt: a.ai.generatedAt ?? null,
  result: a.ai.result ?? null,
  error: a.ai.error ?? null,
  note: a.ai.note ?? null,
  attempts: a.ai.attempts,
  canRetry:
    a.ai.status === "unavailable" &&
    a.ai.attempts < MAX_AI_ATTEMPTS &&
    a.redFlags.level !== "emergency" &&
    (a.status === "awaiting_review" || a.status === "in_review"),
});

export const presentReview = (r: AssessmentReviewEntity, names: NameMap) => ({
  id: String(r._id),
  kind: r.kind,
  doctor: person(names, r.doctorId),
  findings: r.findings,
  aiComparison: r.aiComparison,
  outcome: r.outcome ?? null,
  submittedAt: r.submittedAt,
  /** Amendments keep the original: only when and why are exposed here. */
  revisions: r.revisions.map((v) => ({ amendedAt: v.amendedAt, reason: v.reason })),
});

export const presentSecondOpinion = (
  so: SecondOpinionRequestEntity,
  names: NameMap,
) => ({
  id: String(so._id),
  assessmentId: String(so.assessmentId),
  status: so.status,
  reason: so.reason ?? null,
  requestedByRole: so.requestedByRole,
  assignedDoctor: person(names, so.assignedDoctorId),
  finalOutcome: so.finalOutcome
    ? {
        result: so.finalOutcome.result,
        summary: so.finalOutcome.summary,
        decidedAt: so.finalOutcome.decidedAt,
      }
    : null,
  createdAt: so.createdAt,
});

const symptomsView = (a: AssessmentEntity) => a.symptoms;

export const presentPatientAssessment = (
  a: AssessmentEntity,
  ctx: {
    reviews: AssessmentReviewEntity[];
    secondOpinion: SecondOpinionRequestEntity | null;
    names: NameMap;
    carePlanId: string | null;
  },
) => ({
  id: String(a._id),
  status: a.status,
  priority: a.priority,
  createdAt: a.createdAt,
  updatedAt: a.updatedAt,
  symptoms: symptomsView(a),
  description: a.description ?? null,
  safety: presentSafety(a),
  ai: presentAi(a),
  assignedDoctor: person(ctx.names, a.assignedDoctorId),
  // Doctor findings are separate records and are never merged into `ai`.
  reviews: ctx.reviews.map((r) => presentReview(r, ctx.names)),
  secondOpinion: ctx.secondOpinion ? presentSecondOpinion(ctx.secondOpinion, ctx.names) : null,
  carePlanId: ctx.carePlanId,
});

export const presentPatientSummary = (a: AssessmentEntity, reviewCount: number) => ({
  id: String(a._id),
  status: a.status,
  priority: a.priority,
  createdAt: a.createdAt,
  symptoms: a.symptoms.map((s) => ({ name: s.name, severity: s.severity })),
  safetyLevel: a.redFlags.level,
  aiStatus: a.ai.status,
  aiMode: a.ai.mode ?? null,
  reviewCount,
});

export type DoctorRole = "primary" | "second_opinion";

export const presentDoctorAssessment = (
  a: AssessmentEntity,
  ctx: {
    role: DoctorRole;
    reviews: AssessmentReviewEntity[];
    secondOpinion: SecondOpinionRequestEntity | null;
    names: NameMap;
    carePlanId: string | null;
    /** True when earlier reviews are hidden to keep a second opinion independent. */
    blind: boolean;
  },
) => ({
  id: String(a._id),
  role: ctx.role,
  status: a.status,
  priority: a.priority,
  createdAt: a.createdAt,
  updatedAt: a.updatedAt,
  patient: {
    ...person(ctx.names, a.patientId),
    ageYears: a.profileSnapshot.ageYears ?? null,
    gender: a.profileSnapshot.gender ?? null,
    allergies: a.profileSnapshot.allergies,
    currentMedications: a.profileSnapshot.currentMedications,
    conditions: a.profileSnapshot.conditions,
  },
  symptoms: symptomsView(a),
  description: a.description ?? null,
  safety: presentSafety(a),
  ai: presentAi(a),
  primaryDoctor: person(ctx.names, a.assignedDoctorId),
  reviews: ctx.reviews.map((r) => presentReview(r, ctx.names)),
  reviewsHiddenForIndependence: ctx.blind,
  secondOpinion: ctx.secondOpinion ? presentSecondOpinion(ctx.secondOpinion, ctx.names) : null,
  carePlanId: ctx.carePlanId,
});

/** Unclaimed-case preview: deliberately contains no patient name or contact. */
export const presentQueueItem = (
  a: AssessmentEntity,
  extra?: { secondOpinion?: SecondOpinionRequestEntity },
) => ({
  id: String(a._id),
  type: extra?.secondOpinion ? ("second_opinion" as const) : ("primary" as const),
  secondOpinionId: extra?.secondOpinion ? String(extra.secondOpinion._id) : null,
  secondOpinionReason: extra?.secondOpinion?.reason ?? null,
  priority: a.priority,
  createdAt: a.createdAt,
  patient: { ageYears: a.profileSnapshot.ageYears ?? null, gender: a.profileSnapshot.gender ?? null },
  symptoms: symptomsView(a),
  description: a.description ?? null,
  safety: {
    level: a.redFlags.level,
    matches: a.redFlags.matches.map((m) => ({ id: m.id, label: m.label, level: m.level })),
  },
  ai: {
    status: a.ai.status,
    mode: a.ai.mode ?? null,
    summary:
      a.ai.status === "completed" && typeof a.ai.result?.["summary"] === "string"
        ? (a.ai.result["summary"] as string)
        : null,
    riskEstimate:
      a.ai.status === "completed" && typeof a.ai.result?.["aiRiskEstimate"] === "string"
        ? (a.ai.result["aiRiskEstimate"] as string)
        : null,
  },
});

export const presentDoctorSummary = (
  a: AssessmentEntity,
  role: DoctorRole,
  names: NameMap,
) => ({
  id: String(a._id),
  role,
  status: a.status,
  priority: a.priority,
  createdAt: a.createdAt,
  updatedAt: a.updatedAt,
  patient: person(names, a.patientId),
  symptoms: a.symptoms.map((s) => ({ name: s.name, severity: s.severity })),
  safetyLevel: a.redFlags.level,
});

// ---- care plans ----------------------------------------------------------
const DAY_MS = 24 * 60 * 60 * 1000;

/** Overdue once the whole due day has passed. */
export const isTaskOverdue = (
  task: CarePlanEntity["tasks"][number],
  now: number = Date.now(),
): boolean =>
  (task.status === "pending" || task.status === "in_progress") &&
  task.dueDate !== undefined &&
  task.dueDate.getTime() + DAY_MS <= now;

export const presentCarePlan = (
  plan: CarePlanEntity,
  names: NameMap,
  opts: { includePatient: boolean },
) => {
  const now = Date.now();
  const tasks = plan.tasks.map((t) => ({
    id: String(t._id),
    title: t.title,
    description: t.description ?? null,
    type: t.type,
    dueDate: t.dueDate ?? null,
    status: t.status,
    completedAt: t.completedAt ?? null,
    notes: t.notes ?? null,
    isOverdue: isTaskOverdue(t, now),
  }));
  const done = tasks.filter((t) => t.status === "completed" || t.status === "skipped").length;
  return {
    id: String(plan._id),
    assessmentId: String(plan.assessmentId),
    title: plan.title,
    summary: plan.summary ?? null,
    doctor: person(names, plan.doctorId),
    ...(opts.includePatient ? { patient: person(names, plan.patientId) } : {}),
    tasks,
    referrals: plan.referrals,
    followUpDate: plan.followUpDate ?? null,
    progressStatus: plan.progressStatus,
    progress: {
      done,
      total: tasks.length,
      percent: tasks.length === 0 ? 0 : Math.round((done / tasks.length) * 100),
      overdue: tasks.filter((t) => t.isOverdue).length,
    },
    createdAt: plan.createdAt,
    updatedAt: plan.updatedAt,
  };
};
