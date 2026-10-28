import mongoose, { Schema, type Model, type Types } from "mongoose";
import {
  AI_AGREEMENTS,
  REVIEW_KINDS,
  REVIEW_URGENCIES,
  SECOND_OPINION_OUTCOMES,
  type AiAgreement,
  type ReviewKind,
  type SecondOpinionOutcome,
} from "../constants/clinical.js";

export interface ReviewFindings {
  impression: string;
  possibleConditions: string[];
  recommendedTests: string[];
  urgency: (typeof REVIEW_URGENCIES)[number];
  advice: string;
  notes?: string;
}

export interface ReviewAiComparison {
  agreement: AiAgreement;
  differences?: string;
}

export interface ReviewOutcome {
  result: SecondOpinionOutcome;
  summary: string;
}

export interface AssessmentReviewEntity {
  _id: Types.ObjectId;
  assessmentId: Types.ObjectId;
  doctorId: Types.ObjectId;
  kind: ReviewKind;
  /** The doctor's own findings. Never merged into the AI result. */
  findings: ReviewFindings;
  aiComparison: ReviewAiComparison;
  /** Second-opinion reviews only. */
  outcome?: ReviewOutcome;
  /** Append-only history: each amendment keeps the previous version. */
  revisions: {
    amendedAt: Date;
    amendedBy: Types.ObjectId;
    reason: string;
    previous: {
      findings: ReviewFindings;
      aiComparison: ReviewAiComparison;
      outcome?: ReviewOutcome;
    };
  }[];
  submittedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const findingsSchema = new Schema(
  {
    impression: { type: String, required: true, trim: true, maxlength: 2000 },
    possibleConditions: { type: [{ type: String, trim: true, maxlength: 150 }], default: [] },
    recommendedTests: { type: [{ type: String, trim: true, maxlength: 150 }], default: [] },
    urgency: { type: String, enum: REVIEW_URGENCIES, required: true },
    advice: { type: String, required: true, trim: true, maxlength: 2000 },
    notes: { type: String, trim: true, maxlength: 2000 },
  },
  { _id: false },
);
const comparisonSchema = new Schema(
  {
    agreement: { type: String, enum: AI_AGREEMENTS, required: true },
    differences: { type: String, trim: true, maxlength: 1500 },
  },
  { _id: false },
);
const outcomeSchema = new Schema(
  {
    result: { type: String, enum: SECOND_OPINION_OUTCOMES, required: true },
    summary: { type: String, required: true, trim: true, maxlength: 2000 },
  },
  { _id: false },
);

const reviewSchema = new Schema<AssessmentReviewEntity>(
  {
    assessmentId: { type: Schema.Types.ObjectId, ref: "Assessment", required: true, index: true },
    doctorId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    kind: { type: String, enum: REVIEW_KINDS, required: true },
    findings: { type: findingsSchema, required: true },
    aiComparison: { type: comparisonSchema, required: true },
    outcome: { type: outcomeSchema },
    revisions: {
      type: [
        new Schema(
          {
            amendedAt: { type: Date, required: true },
            amendedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
            reason: { type: String, required: true, trim: true, maxlength: 500 },
            previous: {
              type: new Schema(
                {
                  findings: { type: findingsSchema, required: true },
                  aiComparison: { type: comparisonSchema, required: true },
                  outcome: { type: outcomeSchema },
                },
                { _id: false },
              ),
              required: true,
            },
          },
          { _id: false },
        ),
      ],
      default: [],
    },
    submittedAt: { type: Date, required: true },
  },
  { timestamps: true },
);

// One primary review and one second-opinion review per assessment. This also
// makes concurrent duplicate submissions fail safely with a 409.
reviewSchema.index({ assessmentId: 1, kind: 1 }, { unique: true });

export const AssessmentReview: Model<AssessmentReviewEntity> =
  (mongoose.models["AssessmentReview"] as Model<AssessmentReviewEntity> | undefined) ??
  mongoose.model<AssessmentReviewEntity>("AssessmentReview", reviewSchema);
