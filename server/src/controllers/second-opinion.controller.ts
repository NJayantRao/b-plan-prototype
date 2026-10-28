import type { Request, RequestHandler, Response } from "express";
import { requireAuth } from "../middlewares/authorize.js";
import { getRequestContext } from "../services/audit.service.js";
import * as secondOpinionService from "../services/second-opinion.service.js";
import ApiResponse from "../utils/api-response.js";
import AsyncHandler from "../utils/async-handler.js";
import { idParamSchema } from "../validators/common.validator.js";
import {
  listSecondOpinionsQuerySchema,
  requestSecondOpinionSchema,
} from "../validators/second-opinion.validator.js";

export const request: RequestHandler = AsyncHandler(async (req: Request, res: Response) => {
  const actor = requireAuth(req);
  const { id } = idParamSchema.parse(req.params);
  const { reason } = requestSecondOpinionSchema.parse(req.body ?? {});
  const secondOpinion = await secondOpinionService.requestSecondOpinion(
    actor,
    id,
    reason,
    getRequestContext(req),
  );
  res.status(201).json(new ApiResponse(201, "Second opinion requested", { secondOpinion }));
});

export const list: RequestHandler = AsyncHandler(async (req: Request, res: Response) => {
  const actor = requireAuth(req);
  const query = listSecondOpinionsQuerySchema.parse(req.query);
  const data = await secondOpinionService.listSecondOpinions(actor, query);
  res.status(200).json(new ApiResponse(200, "Second opinions", data));
});

export const claim: RequestHandler = AsyncHandler(async (req: Request, res: Response) => {
  const { userId } = requireAuth(req);
  const { id } = idParamSchema.parse(req.params);
  const secondOpinion = await secondOpinionService.claimSecondOpinionForDoctor(
    userId,
    id,
    getRequestContext(req),
  );
  res.status(200).json(new ApiResponse(200, "Second opinion claimed", { secondOpinion }));
});
