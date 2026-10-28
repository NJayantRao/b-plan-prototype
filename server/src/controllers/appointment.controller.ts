import type { Request, RequestHandler, Response } from "express";
import { requireAuth } from "../middlewares/authorize.js";
import * as appointmentService from "../services/appointment.service.js";
import { getRequestContext } from "../services/audit.service.js";
import ApiResponse from "../utils/api-response.js";
import AsyncHandler from "../utils/async-handler.js";
import { idParamSchema } from "../validators/common.validator.js";
import {
  createAppointmentSchema,
  listAppointmentsQuerySchema,
  updateAppointmentStatusSchema,
} from "../validators/appointment.validator.js";

export const create: RequestHandler = AsyncHandler(async (req: Request, res: Response) => {
  const actor = requireAuth(req);
  const input = createAppointmentSchema.parse(req.body);
  const appointment = await appointmentService.createForPatient(actor.userId, input, getRequestContext(req));
  res.status(201).json(new ApiResponse(201, "Appointment requested", { appointment }));
});

export const list: RequestHandler = AsyncHandler(async (req: Request, res: Response) => {
  const actor = requireAuth(req);
  const query = listAppointmentsQuerySchema.parse(req.query);
  const data = await appointmentService.listForActor(actor, query);
  res.status(200).json(new ApiResponse(200, "Appointments", data));
});

export const updateStatus: RequestHandler = AsyncHandler(async (req: Request, res: Response) => {
  const actor = requireAuth(req);
  const { id } = idParamSchema.parse(req.params);
  const input = updateAppointmentStatusSchema.parse(req.body);
  const appointment = await appointmentService.updateStatus(actor, id, input, getRequestContext(req));
  res.status(200).json(new ApiResponse(200, "Appointment status updated", { appointment }));
});
