import mongoose, { Schema, type Model, type Types } from "mongoose";
import { NOTIFICATION_TYPES, type NotificationType } from "../constants/supporting.js";

export interface NotificationEntity {
  _id: Types.ObjectId;
  recipientId: Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  readAt?: Date;
  simulatedDelivery: true;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<NotificationEntity>(
  {
    recipientId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: { type: String, enum: NOTIFICATION_TYPES, required: true },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    message: { type: String, required: true, trim: true, maxlength: 500 },
    readAt: { type: Date },
    simulatedDelivery: { type: Boolean, required: true, default: true, immutable: true },
  },
  { timestamps: true },
);
schema.index({ recipientId:  1, createdAt: -1 });

export const Notification: Model<NotificationEntity> =
  (mongoose.models["Notification"] as Model<NotificationEntity> | undefined) ??
  mongoose.model<NotificationEntity>("Notification", schema);
