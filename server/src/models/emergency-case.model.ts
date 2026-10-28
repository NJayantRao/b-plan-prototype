import mongoose, { Schema, type Model, type Types } from "mongoose";
import {
  EMERGENCY_STATUSES,
  EMERGENCY_URGENCIES,
  type EmergencyStatus,
  type EmergencyUrgency,
} from "../constants/supporting.js";

export interface EmergencyCaseEntity {
  _id: Types.ObjectId;
  requesterId: Types.ObjectId;
  location: { city: string; state: string; address?: string };
  urgency: EmergencyUrgency;
  description: string;
  assignedResponderId?: Types.ObjectId;
  status: EmergencyStatus;
  estimatedArrivalMinutes: number;
  simulated: true;
  statusEvents: { status: EmergencyStatus; actorId: Types.ObjectId; at: Date }[];
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<EmergencyCaseEntity>(
  {
    requesterId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    location: {
      type: new Schema(
        {
          city: { type: String, required: true, trim: true, maxlength: 100 },
          state: { type: String, required: true, trim: true, maxlength: 100 },
          address: { type: String, trim: true, maxlength: 300 },
        },
        { _id: false },
      ),
      required: true,
    },
    urgency: { type: String, enum: EMERGENCY_URGENCIES, required: true },
    description: { type: String, required: true, trim: true, maxlength: 1000 },
    assignedResponderId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    status: { type: String, enum: EMERGENCY_STATUSES, required: true, default: "queued" },
    estimatedArrivalMinutes: { type: Number, required: true, min: 5, max: 30 },
    simulated: { type: Boolean, required: true, default: true, immutable: true },
    statusEvents: {
      type: [
        new Schema(
          {
            status: { type: String, enum: EMERGENCY_STATUSES, required: true },
            actorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
            at: { type: Date, required: true },
          },
          { _id: false },
        ),
      ],
      default: [],
    },
  },
  { timestamps: true },
);
schema.index({ status: 1, urgency: -1, createdAt: 1 });

export const EmergencyCase: Model<EmergencyCaseEntity> =
  (mongoose.models["EmergencyCase"] as Model<EmergencyCaseEntity> | undefined) ??
  mongoose.model<EmergencyCaseEntity>("EmergencyCase", schema);
