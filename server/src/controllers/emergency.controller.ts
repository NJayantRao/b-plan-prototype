import type { Request, RequestHandler, Response } from "express";
import { requireAuth } from "../middlewares/authorize.js";
import * as emergencyService from "../services/emergency.service.js";
import { getRequestContext } from "../services/audit.service.js";
import ApiResponse from "../utils/api-response.js";
import AsyncHandler from "../utils/async-handler.js";
import {
  createEmergencySchema,
  emergencyIdParamSchema,
  listEmergenciesQuerySchema,
  updateEmergencyStatusSchema,
} from "../validators/emergency.validator.js";

export const create: RequestHandler = AsyncHandler(async (req: Request, res: Response) => {
  const actor = requireAuth(req);
  const input = createEmergencySchema.parse(req.body);
  const emergency = await emergencyService.createCase(actor, input, getRequestContext(req));
  res.status(201).json(new ApiResponse(201, "Simulated emergency created", { emergency }));
});

export const list: RequestHandler = AsyncHandler(async (req: Request, res: Response) => {
  const actor = requireAuth(req);
  const { page, limit, status } = listEmergenciesQuerySchema.parse(req.query);
  const data = await emergencyService.listCases(actor, page, limit, status);
  res.status(200).json(new ApiResponse(200, "Simulated emergency cases", data));
});

export const getOne: RequestHandler = AsyncHandler(async (req: Request, res: Response) => {
  const actor = requireAuth(req);
  const { id } = emergencyIdParamSchema.parse(req.params);
  const emergency = await emergencyService.getCase(actor, id, getRequestContext(req));
  res.status(200).json(new ApiResponse(200, "Simulated emergency case", { emergency }));
});

export const claim: RequestHandler = AsyncHandler(async (req: Request, res: Response) => {
  const actor = requireAuth(req);
  const { id } = emergencyIdParamSchema.parse(req.params);
  const emergency = await emergencyService.claimCase(actor, id, getRequestContext(req));
  res.status(200).json(new ApiResponse(200, "Simulated case claimed", { emergency }));
});

export const updateStatus: RequestHandler = AsyncHandler(async (req: Request, res: Response) => {
  const actor = requireAuth(req);
  const { id } = emergencyIdParamSchema.parse(req.params);
  const { status } = updateEmergencyStatusSchema.parse(req.body);
  const emergency = await emergencyService.updateStatus(actor, id, status, getRequestContext(req));
  res.status(200).json(new ApiResponse(200, "Simulated emergency status updated", { emergency }));
});

export const cancel: RequestHandler = AsyncHandler(async (req: Request, res: Response) => {
  const actor = requireAuth(req);
  const { id } = emergencyIdParamSchema.parse(req.params);
  const emergency = await emergencyService.updateStatus(actor, id, "cancelled", getRequestContext(req));
  res.status(200).json(new ApiResponse(200, "Simulated emergency cancelled", { emergency }));
});
