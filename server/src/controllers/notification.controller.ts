import type { Request, RequestHandler, Response } from "express";
import { requireAuth } from "../middlewares/authorize.js";
import * as notificationService from "../services/notification.service.js";
import ApiResponse from "../utils/api-response.js";
import AsyncHandler from "../utils/async-handler.js";
import { notificationIdParamSchema, listNotificationsQuerySchema } from "../validators/notification.validator.js";

export const list: RequestHandler = AsyncHandler(async (req: Request, res: Response) => {
  const { userId } = requireAuth(req);
  const { page, limit } = listNotificationsQuerySchema.parse(req.query);
  const data = await notificationService.listForUser(userId, page, limit);
  res.status(200).json(new ApiResponse(200, "Notifications", data));
});

export const markRead: RequestHandler = AsyncHandler(async (req: Request, res: Response) => {
  const { userId } = requireAuth(req);
  const { id } = notificationIdParamSchema.parse(req.params);
  const notification = await notificationService.markRead(userId, id);
  res.status(200).json(new ApiResponse(200, "Notification marked as read", { notification }));
});
