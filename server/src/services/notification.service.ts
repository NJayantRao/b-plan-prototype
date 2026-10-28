import { Types } from "mongoose";
import logger from "../config/logger.js";
import type { NotificationType } from "../constants/supporting.js";
import {
  countUnreadNotifications,
  createNotification,
  findNotificationById,
  listNotifications,
  markNotificationRead,
} from "../repository/notification.repository.js";
import { NotFoundError } from "../utils/api-error.js";
import { buildPagination } from "../utils/pagination.js";

export const notify = async (
  recipientId: Types.ObjectId | string,
  type: NotificationType,
  title: string,
  message: string,
): Promise<void> => {
  try {
    await createNotification({
      recipientId: new Types.ObjectId(recipientId),
      type,
      title,
      message,
    });
  } catch (error) {
    logger.error(
      `SIMULATED NOTIFICATION WRITE FAILED: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
};

export const listForUser = async (userId: string, page: number, limit: number) => {
  const [{ items, total }, unreadCount] = await Promise.all([
    listNotifications(userId, page, limit),
    countUnreadNotifications(userId),
  ]);
  return {
    items: items.map((item) => ({
      id: String(item._id),
      type: item.type,
      title: item.title,
      message: item.message,
      readAt: item.readAt ?? null,
      simulatedDelivery: item.simulatedDelivery,
      createdAt: item.createdAt,
    })),
    unreadCount,
    pagination: buildPagination(page, limit, total),
  };
};

export const markRead = async (userId: string, id: string) => {
  const notification = await markNotificationRead(id, userId);
  if (notification) {
    return {
      id: String(notification._id),
      readAt: notification.readAt ?? null,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      simulatedDelivery: notification.simulatedDelivery,
      createdAt: notification.createdAt,
    };
  }
  const existing = await findNotificationById(id);
  if (!existing || String(existing.recipientId) !== userId) {
    throw new NotFoundError("Notification not found");
  }
  return {
    id: String(existing._id),
    readAt: existing.readAt ?? null,
    type: existing.type,
    title: existing.title,
    message: existing.message,
    simulatedDelivery: existing.simulatedDelivery,
    createdAt: existing.createdAt,
  };
};
