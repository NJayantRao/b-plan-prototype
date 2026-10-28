import type { Request, RequestHandler, Response } from "express";
import { requireAuth } from "../middlewares/authorize.js";
import * as donorService from "../services/donor.service.js";
import { getRequestContext } from "../services/audit.service.js";
import ApiResponse from "../utils/api-response.js";
import AsyncHandler from "../utils/async-handler.js";
import {
  createDonorRequestSchema,
  donorProfileSchema,
  donorRequestParamsSchema,
  donorSearchSchema,
  listDonorRequestsQuerySchema,
  updateDonorRequestSchema,
} from "../validators/donor.validator.js";

export const getMyProfile: RequestHandler = AsyncHandler(async (req: Request, res: Response) => {
  const actor = requireAuth(req);
  const profile = await donorService.getMyDonorProfile(actor);
  res.status(200).json(new ApiResponse(200, "Donor profile", { profile }));
});

export const register: RequestHandler = AsyncHandler(async (req: Request, res: Response) => {
  const actor = requireAuth(req);
  const input = donorProfileSchema.parse(req.body);
  const profile = await donorService.registerDonor(actor, input, getRequestContext(req));
  res.status(200).json(new ApiResponse(200, "Donor profile saved", { profile }));
});

export const search: RequestHandler = AsyncHandler(async (req: Request, res: Response) => {
  const actor = requireAuth(req);
  const query = donorSearchSchema.parse(req.query);
  const data = await donorService.searchDonors(actor, query);
  res.status(200).json(new ApiResponse(200, "Synthetic donor availability", data));
});

export const createRequest: RequestHandler = AsyncHandler(async (req: Request, res: Response) => {
  const actor = requireAuth(req);
  const input = createDonorRequestSchema.parse(req.body);
  const request = await donorService.createRequest(actor, input, getRequestContext(req));
  res.status(201).json(new ApiResponse(201, "Donor request created", { request }));
});

export const listRequests: RequestHandler = AsyncHandler(async (req: Request, res: Response) => {
  const actor = requireAuth(req);
  const { page, limit, status } = listDonorRequestsQuerySchema.parse(req.query);
  const data = await donorService.listRequests(actor, page, limit, status);
  res.status(200).json(new ApiResponse(200, "Donor requests", data));
});

export const updateRequest: RequestHandler = AsyncHandler(async (req: Request, res: Response) => {
  const actor = requireAuth(req);
  const { id } = donorRequestParamsSchema.parse(req.params);
  const { status } = updateDonorRequestSchema.parse(req.body);
  const request = await donorService.updateRequest(actor, id, status, getRequestContext(req));
  res.status(200).json(new ApiResponse(200, "Donor request updated", { request }));
});
