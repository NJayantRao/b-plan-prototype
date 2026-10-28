import mongoose, { Schema, type Model, type Types } from "mongoose";
import {
  AI_MODES,
  AI_STATUSES,
  ASSESSMENT_STATUSES,
  DURATION_UNITS,
  PRIORITIES,
  RED_FLAG_LEVELS,
  SEVERITIES,
  type AiMode,
  type AiStatus,
  type AssessmentStatus,
  type DurationUnit,
  type Priority,
  type RedFlagLevel,
  type Severity,
} from "../constants/clinical.js";
import type { Gender } from "./patient-profile.model.js";

export interface AssessmentEntity {
  _id: Types.ObjectId;
  /** The patient's User _id. */
  patientId: Types.ObjectId;
  symptoms: {
    name: string;
    severity: Severity;
    duration: { value: number; unit: DurationUnit };
  }[];
  description?: string;
  /** Minimal copy of profile data used for this assessment (data minimisation). */
  profileSnapshot: {
    ageYears?: number;
    gender?: Gender;
    allergies: string[];
    currentMedications: string[];
    conditions: string[];
  };
  /** Rule-based safety pathway. Independent of, and never overridden by, the AI. */
  redFlags: {
    level: RedFlagLevel;
    matches: { id: string; label: string; level: RedFlagLevel }[];
    advice: string;
    rulesVersion: string;
    clinicallyReviewed: boolean;
    evaluatedAt: Date;
  };
  priority: Priority;
  priorityRank: number;
  /** AI output lives here and is never edited by doctors. */
  ai: {
    status: AiStatus;
    mode?: AiMode;
    model?: string;
    generatedAt?: Date;
    attempts: number;
    result?: Record<string, unknown>;
    error?: { code: string; message: string };
    note?: string;
  };
  status: AssessmentStatus;
  assignedDoctorId?: Types.ObjectId;
  claimedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const assessmentSchema = new Schema<AssessmentEntity>(
  {
    patientId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    symptoms: {
      type: [
        new Schema(
          {
            name: { type: String, required: true, trim: true, maxlength: 100 },
            severity: { type: String, enum: SEVERITIES, required: true },
            duration: {
              type: new Schema(
                {
                  value: { type: Number, required: true, min: 1, max: 1000 },
                  unit: { type: String, enum: DURATION_UNITS, required: true },
                },
                { _id: false },
              ),
              required: true,
            },
          },
          { _id: false },
        ),
      ],
      validate: (v: unknown[]) => v.length >= 1 && v.length <= 10,
    },
    description: { type: String, trim: true, maxlength: 2000 },
    profileSnapshot: {
      type: new Schema(
        {
          ageYears: { type: Number, min: 0, max: 130 },
          gender: { type: String },
          allergies: { type: [String], default: [] },
          currentMedications: { type: [String], default: [] },
          conditions: { type: [String], default: [] },
        },
        { _id: false },
      ),
      required: true,
    },
    redFlags: {
      type: new Schema(
        {
          level: { type: String, enum: RED_FLAG_LEVELS, required: true },
          matches: {
            type: [
              new Schema(
                {
                  id: { type: String, required: true },
                  label: { type: String, required: true },
                  level: { type: String, enum: RED_FLAG_LEVELS, required: true },
                },
                { _id: false },
              ),
            ],
            default: [],
          },
          advice: { type: String, required: true },
          rulesVersion: { type: String, required: true },
          clinicallyReviewed: { type: Boolean, required: true },
          evaluatedAt: { type: Date, required: true },
        },
        { _id: false },
      ),
      required: true,
    },
    priority: { type: String, enum: PRIORITIES, required: true, default: "routine" },
    priorityRank: { type: Number, required: true, default: 2 },
    ai: {
      type: new Schema(
        {
          status: { type: String, enum: AI_STATUSES, required: true },
          mode: { type: String, enum: AI_MODES },
          model: { type: String },
          generatedAt: { type: Date },
          attempts: { type: Number, required: true, default: 0 },
          result: { type: Schema.Types.Mixed },
          error: {
            type: new Schema(
              { code: { type: String, required: true }, message: { type: String, required: true } },
              { _id: false },
            ),
          },
          note: { type: String },
        },
        { _id: false },
      ),
      required: true,
    },
    status: {
      type: String,
      enum: ASSESSMENT_STATUSES,
      required: true,
      default: "awaiting_review",
    },
    assignedDoctorId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    claimedAt: { type: Date },
    completedAt: { type: Date },
  },
  { timestamps: true },
);

assessmentSchema.index({ patientId: 1, createdAt: -1 });
// Doctor queue: unclaimed cases, most urgent first, then oldest.
assessmentSchema.index({ status: 1, priorityRank: 1, createdAt: 1 });

export const Assessment: Model<AssessmentEntity> =
  (mongoose.models["Assessment"] as Model<AssessmentEntity> | undefined) ??
  mongoose.model<AssessmentEntity>("Assessment", assessmentSchema);
