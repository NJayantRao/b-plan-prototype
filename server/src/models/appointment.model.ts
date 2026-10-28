import mongoose, { Schema, type Model, type Types } from "mongoose";
import { APPOINTMENT_STATUSES, type AppointmentStatus } from "../constants/supporting.js";

export interface AppointmentEntity {
  _id: Types.ObjectId;
  patientId: Types.ObjectId;
  doctorId: Types.ObjectId;
  scheduledAt: Date;
  durationMinutes: 30;
  reason?: string;
  status: AppointmentStatus;
  slotActive: boolean;
  cancellation?: { cancelledBy: Types.ObjectId; cancelledAt: Date; reason?: string };
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<AppointmentEntity>(
  {
    patientId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    doctorId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    scheduledAt: { type: Date, required: true },
    durationMinutes: { type: Number, required: true, default: 30, enum: [30] },
    reason: { type: String, trim: true, maxlength: 1000 },
    status: { type: String, enum: APPOINTMENT_STATUSES, required: true, default: "requested" },
    slotActive: { type: Boolean, required: true, default: true },
    cancellation: {
      type: new Schema(
        {
          cancelledBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
          cancelledAt: { type: Date, required: true },
          reason: { type: String, trim: true, maxlength: 500 },
        },
        { _id: false },
      ),
    },
  },
  { timestamps: true },
);

// All slots are exactly 30 minutes and constrained to :00 or :30.
schema.index(
  { doctorId: 1, scheduledAt: 1 },
  {
    unique: true,
    partialFilterExpression: { slotActive: true },
  },
);
schema.index({ patientId: 1, scheduledAt: -1 });

export const Appointment: Model<AppointmentEntity> =
  (mongoose.models["Appointment"] as Model<AppointmentEntity> | undefined) ??
  mongoose.model<AppointmentEntity>("Appointment", schema);
