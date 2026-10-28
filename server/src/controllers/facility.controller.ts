import type { Request, RequestHandler, Response } from "express";
import { requireAuth } from "../middlewares/authorize.js";
import * as facilityService from "../services/facility.service.js";
import { getRequestContext } from "../services/audit.service.js";
import ApiResponse from "../utils/api-response.js";
import AsyncHandler from "../utils/async-handler.js";
import { createFacilitySchema, listFacilitiesQuerySchema } from "../validators/facility.validator.js";

export const create: RequestHandler = AsyncHandler(async (req: Request, res: Response) => {
  const actor = requireAuth(req);
  const input = createFacilitySchema.parse(req.body);
  const facility = await facilityService.createForPartner(actor, input, getRequestContext(req));
  res.status(201).json(new ApiResponse(201, "Facility submitted for verification", { facility }));
});

export const list: RequestHandler = AsyncHandler(async (req: Request, res: Response) => {
  const actor = requireAuth(req);
  const query = listFacilitiesQuerySchema.parse(req.query);
  const data = await facilityService.listVisibleFacilities(actor, query);
  res.status(200).json(new ApiResponse(200, "Facilities", data));
});
