import type { Types } from "mongoose";
import { Notification, type NotificationEntity } from "../models/notification.model.js";

type Id = string | Types.ObjectId;

export const createNotification = async (
  data: Omit<NotificationEntity, "_id" | "createdAt" | "updatedAt" | "readAt" | "simulatedDelivery">,
) => {
  const notification = await Notification.create(data);
  return notification.toObject() as NotificationEntity;
};

export const listNotifications = async (recipientId: Id, page: number, limit: number) => {
  const filter = { recipientId };
  const [items, total] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit)
      .lean<NotificationEntity[]>().exec(),
    Notification.countDocuments(filter).exec(),
  ]);
  return { items, total };
};

export const findNotificationById = (id: Id) =>
  Notification.findById(id).lean<NotificationEntity>().exec();

export const markNotificationRead = (id: Id, recipientId: Id) =>
  Notification.findOneAndUpdate(
    { _id: id, recipientId, readAt: { $exists: false } },
    { $set: { readAt: new Date() } },
    { returnDocument: "after" },
  )
    .lean<NotificationEntity>()
    .exec();

export const countUnreadNotifications = (recipientId: Id) =>
  Notification.countDocuments({ recipientId, readAt: { $exists: false } }).exec();
