import mongoose, { Schema, type Model, type Types } from "mongoose";
import {
  PLAN_STATUSES,
  TASK_STATUSES,
  TASK_TYPES,
  type PlanStatus,
  type TaskStatus,
  type TaskType,
} from "../constants/clinical.js";

export interface CareTaskEntity {
  _id: Types.ObjectId;
  title: string;
  description?: string;
  type: TaskType;
  dueDate?: Date;
  status: TaskStatus;
  completedAt?: Date;
  notes?: string;
}

export interface CarePlanEntity {
  _id: Types.ObjectId;
  patientId: Types.ObjectId;
  doctorId: Types.ObjectId;
  assessmentId: Types.ObjectId;
  title: string;
  summary?: string;
  tasks: CareTaskEntity[];
  referrals: {
    specialty: string;
    reason: string;
    urgency: "routine" | "soon" | "urgent";
  }[];
  followUpDate?: Date;
  progressStatus: PlanStatus;
  createdAt: Date;
  updatedAt: Date;
}

const carePlanSchema = new Schema<CarePlanEntity>(
  {
    patientId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    doctorId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    // unique: one care plan per assessment.
    assessmentId: { type: Schema.Types.ObjectId, ref: "Assessment", required: true, unique: true },
    title: { type: String, required: true, trim: true, maxlength: 150 },
    summary: { type: String, trim: true, maxlength: 2000 },
    tasks: {
      type: [
        new Schema(
          {
            title: { type: String, required: true, trim: true, maxlength: 200 },
            description: { type: String, trim: true, maxlength: 1000 },
            type: { type: String, enum: TASK_TYPES, required: true },
            dueDate: { type: Date },
            status: { type: String, enum: TASK_STATUSES, required: true, default: "pending" },
            completedAt: { type: Date },
            notes: { type: String, trim: true, maxlength: 1000 },
          },
          { timestamps: false },
        ),
      ],
      default: [],
    },
    referrals: {
      type: [
        new Schema(
          {
            specialty: { type: String, required: true, trim: true, maxlength: 100 },
            reason: { type: String, required: true, trim: true, maxlength: 500 },
            urgency: { type: String, enum: ["routine", "soon", "urgent"], required: true },
          },
          { _id: false },
        ),
      ],
      default: [],
    },
    followUpDate: { type: Date },
    progressStatus: { type: String, enum: PLAN_STATUSES, required: true, default: "active" },
  },
  { timestamps: true },
);

export const CarePlan: Model<CarePlanEntity> =
  (mongoose.models["CarePlan"] as Model<CarePlanEntity> | undefined) ??
  mongoose.model<CarePlanEntity>("CarePlan", carePlanSchema);
