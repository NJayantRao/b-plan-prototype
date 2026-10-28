import { Types } from "mongoose";
import type {
  ReviewAiComparison,
  ReviewFindings,
  ReviewOutcome,
} from "../models/assessment-review.model.js";
import {
  findAssessmentById,
  transitionAssessment,
} from "../repository/assessment.repository.js";
import {
  createReview,
  findReviewById,
  updateReview,
} from "../repository/review.repository.js";
import {
  completeSecondOpinion,
  findSecondOpinionByAssessment,
  setFinalOutcome,
} from "../repository/second-opinion.repository.js";
import {
  ConflictError,
  NotFoundError,
  ValidationError,
  type ErrorDetail,
} from "../utils/api-error.js";
import type {
  AmendReviewInput,
  CreateReviewInput,
} from "../validators/review.validator.js";
import { refreshedDoctorView } from "./assessment.service.js";
import { recordAudit, type RequestContext } from "./audit.service.js";

type FindingsInput = CreateReviewInput["findings"];
type ComparisonInput = CreateReviewInput["aiComparison"];
type OutcomeInput = NonNullable<CreateReviewInput["outcome"]>;

// Zod gives `T | undefined`; the stored types use true optionals.
const cleanFindings = (f: FindingsInput): ReviewFindings => ({
  impression: f.impression,
  possibleConditions: f.possibleConditions,
  recommendedTests: f.recommendedTests,
  urgency: f.urgency,
  advice: f.advice,
  ...(f.notes ? { notes: f.notes } : {}),
});

const cleanOutcome = (o: OutcomeInput): ReviewOutcome => ({ result: o.result, summary: o.summary });

/**
 * The doctor must explicitly compare their findings with the AI output when
 * one exists. Differences are recorded by the doctor (manual in this prototype).
 */
const resolveComparison = (
  aiStatus: string,
  c: ComparisonInput,
): ReviewAiComparison => {
  const errors: ErrorDetail[] = [];

  if (aiStatus === "completed") {
    if (c.agreement === "not_assessed") {
      errors.push({ field: "aiComparison.agreement", message: "Compare your findings with the AI assessment" });
    } else if (c.agreement !== "agree" && !c.differences) {
      errors.push({ field: "aiComparison.differences", message: "Describe how your findings differ from the AI output" });
    }
  } else if (c.agreement !== "not_assessed") {
    errors.push({ field: "aiComparison.agreement", message: "There is no AI output to compare against for this case" });
  }

  if (errors.length > 0) throw new ValidationError("Validation failed", errors);
  return { agreement: c.agreement, ...(c.differences ? { differences: c.differences } : {}) };
};

export const submitReview = async (
  doctorId: string,
  assessmentId: string,
  input: CreateReviewInput,
  ctx: RequestContext,
) => {
  const a = await findAssessmentById(assessmentId);
  if (!a) throw new NotFoundError("Assessment not found");
  const so = await findSecondOpinionByAssessment(a._id);

  const isPrimaryDoctor = a.assignedDoctorId !== undefined && String(a.assignedDoctorId) === doctorId;
  const isSecondDoctor = so?.assignedDoctorId !== undefined && String(so.assignedDoctorId) === doctorId;
  if (!isPrimaryDoctor && !isSecondDoctor) throw new NotFoundError("Assessment not found");

  const kind =
    isPrimaryDoctor && a.status === "in_review"
      ? "primary"
      : isSecondDoctor && a.status === "second_opinion" && so?.status === "assigned"
        ? "second_opinion"
        : null;
  if (!kind) {
    throw new ConflictError(
      "A review can't be submitted for this case in its current state.",
      "REVIEW_NOT_ALLOWED",
    );
  }

  if (kind === "primary" && input.outcome) {
    throw new ValidationError("Validation failed", [
      { field: "outcome", message: "An outcome is only recorded on a second-opinion review" },
    ]);
  }
  if (kind === "second_opinion" && !input.outcome) {
    throw new ValidationError("Validation failed", [
      { field: "outcome", message: "Record your outcome relative to the first doctor's assessment" },
    ]);
  }

  const aiComparison = resolveComparison(a.ai.status, input.aiComparison);
  const outcome = input.outcome ? cleanOutcome(input.outcome) : undefined;
  const submittedAt = new Date();

  // The unique (assessment, kind) index makes a duplicate submission a 409.
  const review = await createReview({
    assessmentId: a._id,
    doctorId: new Types.ObjectId(doctorId),
    kind,
    findings: cleanFindings(input.findings),
    aiComparison,
    ...(outcome ? { outcome } : {}),
    submittedAt,
  });

  if (kind === "primary") {
    await transitionAssessment(a._id, "in_review", "reviewed");
  } else if (so && outcome) {
    await completeSecondOpinion(so._id, {
      reviewId: review._id,
      finalOutcome: {
        result: outcome.result,
        summary: outcome.summary,
        decidedBy: new Types.ObjectId(doctorId),
        decidedAt: submittedAt,
      },
    });
    await transitionAssessment(a._id, "second_opinion", "completed", { completedAt: submittedAt });
  }

  await recordAudit(
    {
      actor: { userId: doctorId, role: "doctor" },
      action: "review.create",
      resourceType: "assessment",
      resourceId: assessmentId,
      outcome: "success",
      metadata: { kind, agreement: aiComparison.agreement, urgency: review.findings.urgency },
    },
    ctx,
  );

  return refreshedDoctorView(assessmentId, doctorId);
};

export const amendReview = async (
  doctorId: string,
  assessmentId: string,
  reviewId: string,
  input: AmendReviewInput,
  ctx: RequestContext,
) => {
  const review = await findReviewById(reviewId);
  if (
    !review ||
    String(review.assessmentId) !== assessmentId ||
    String(review.doctorId) !== doctorId
  ) {
    throw new NotFoundError("Review not found");
  }
  const a = await findAssessmentById(assessmentId);
  if (!a) throw new NotFoundError("Assessment not found");

  if (input.outcome && review.kind !== "second_opinion") {
    throw new ValidationError("Validation failed", [
      { field: "outcome", message: "An outcome only applies to a second-opinion review" },
    ]);
  }

  const aiComparison = input.aiComparison
    ? resolveComparison(a.ai.status, input.aiComparison)
    : undefined;
  const findings = input.findings ? cleanFindings(input.findings) : undefined;
  const outcome = input.outcome ? cleanOutcome(input.outcome) : undefined;

  // Append-only: the previous version is kept in `revisions`, never discarded.
  const amendedAt = new Date();
  const updated = await updateReview(reviewId, {
    $push: {
      revisions: {
        amendedAt,
        amendedBy: new Types.ObjectId(doctorId),
        reason: input.reason,
        previous: {
          findings: review.findings,
          aiComparison: review.aiComparison,
          ...(review.outcome ? { outcome: review.outcome } : {}),
        },
      },
    },
    $set: {
      ...(findings ? { findings } : {}),
      ...(aiComparison ? { aiComparison } : {}),
      ...(outcome ? { outcome } : {}),
    },
  });
  if (!updated) throw new NotFoundError("Review not found");

  if (outcome) {
    const so = await findSecondOpinionByAssessment(a._id);
    if (so) {
      await setFinalOutcome(so._id, {
        result: outcome.result,
        summary: outcome.summary,
        decidedBy: new Types.ObjectId(doctorId),
        decidedAt: amendedAt,
      });
    }
  }

  await recordAudit(
    {
      actor: { userId: doctorId, role: "doctor" },
      action: "review.amend",
      resourceType: "review",
      resourceId: reviewId,
      outcome: "success",
      metadata: {
        fields: [findings && "findings", aiComparison && "aiComparison", outcome && "outcome"].filter(Boolean),
        revision: updated.revisions.length,
      },
    },
    ctx,
  );

  return refreshedDoctorView(assessmentId, doctorId);
};
