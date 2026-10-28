import mongoose, { Schema, type Model, type Types } from "mongoose";
import {
  SECOND_OPINION_OUTCOMES,
  SECOND_OPINION_STATUSES,
  type SecondOpinionOutcome,
  type SecondOpinionStatus,
} from "../constants/clinical.js";

export interface SecondOpinionRequestEntity {
  _id: Types.ObjectId;
  assessmentId: Types.ObjectId;
  patientId: Types.ObjectId;
  requestedBy: Types.ObjectId;
  requestedByRole: "patient" | "doctor";
  reason?: string;
  status: SecondOpinionStatus;
  assignedDoctorId?: Types.ObjectId;
  assignedAt?: Date;
  /** The second doctor's review (kind "second_opinion"). */
  reviewId?: Types.ObjectId;
  finalOutcome?: {
    result: SecondOpinionOutcome;
    summary: string;
    decidedBy: Types.ObjectId;
    decidedAt: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<SecondOpinionRequestEntity>(
  {
    // unique: at most one second opinion per assessment.
    assessmentId: { type: Schema.Types.ObjectId, ref: "Assessment", required: true, unique: true },
    patientId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    requestedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    requestedByRole: { type: String, enum: ["patient", "doctor"], required: true },
    reason: { type: String, trim: true, maxlength: 1000 },
    status: { type: String, enum: SECOND_OPINION_STATUSES, required: true, default: "requested" },
    assignedDoctorId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    assignedAt: { type: Date },
    reviewId: { type: Schema.Types.ObjectId, ref: "AssessmentReview" },
    finalOutcome: {
      type: new Schema(
        {
          result: { type: String, enum: SECOND_OPINION_OUTCOMES, required: true },
          summary: { type: String, required: true, maxlength: 2000 },
          decidedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
          decidedAt: { type: Date, required: true },
        },
        { _id: false },
      ),
    },
  },
  { timestamps: true },
);

schema.index({ status: 1, createdAt: 1 });

export const SecondOpinionRequest: Model<SecondOpinionRequestEntity> =
  (mongoose.models["SecondOpinionRequest"] as Model<SecondOpinionRequestEntity> | undefined) ??
  mongoose.model<SecondOpinionRequestEntity>("SecondOpinionRequest", schema);
