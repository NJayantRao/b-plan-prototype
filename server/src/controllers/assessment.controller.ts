import type { Request, RequestHandler, Response } from "express";
import { requireAuth } from "../middlewares/authorize.js";
import * as assessmentService from "../services/assessment.service.js";
import { getRequestContext } from "../services/audit.service.js";
import * as reviewService from "../services/review.service.js";
import ApiResponse from "../utils/api-response.js";
import AsyncHandler from "../utils/async-handler.js";
import {
  createAssessmentSchema,
  listAssessmentsQuerySchema,
} from "../validators/assessment.validator.js";
import { idParamSchema } from "../validators/common.validator.js";
import {
  amendReviewSchema,
  createReviewSchema,
  reviewParamsSchema,
} from "../validators/review.validator.js";

export const create: RequestHandler = AsyncHandler(async (req: Request, res: Response) => {
  const { userId } = requireAuth(req);
  const input = createAssessmentSchema.parse(req.body);
  const assessment = await assessmentService.createAssessmentForPatient(
    userId,
    input,
    getRequestContext(req),
  );
  res.status(201).json(new ApiResponse(201, "Assessment submitted", { assessment }));
});

export const list: RequestHandler = AsyncHandler(async (req: Request, res: Response) => {
  const actor = requireAuth(req);
  const query = listAssessmentsQuerySchema.parse(req.query);
  const data = await assessmentService.listAssessments(actor, query);
  res.status(200).json(new ApiResponse(200, "Assessments", data));
});

export const getOne: RequestHandler = AsyncHandler(async (req: Request, res: Response) => {
  const actor = requireAuth(req);
  const { id } = idParamSchema.parse(req.params);
  const assessment = await assessmentService.getAssessment(actor, id, getRequestContext(req));
  res.status(200).json(new ApiResponse(200, "Assessment", { assessment }));
});

export const claim: RequestHandler = AsyncHandler(async (req: Request, res: Response) => {
  const { userId } = requireAuth(req);
  const { id } = idParamSchema.parse(req.params);
  const assessment = await assessmentService.claimForDoctor(userId, id, getRequestContext(req));
  res.status(200).json(new ApiResponse(200, "Case claimed", { assessment }));
});

export const retryAi: RequestHandler = AsyncHandler(async (req: Request, res: Response) => {
  const { userId } = requireAuth(req);
  const { id } = idParamSchema.parse(req.params);
  const assessment = await assessmentService.retryAiForPatient(userId, id, getRequestContext(req));
  res.status(200).json(new ApiResponse(200, "AI retry finished", { assessment }));
});

export const submitReview: RequestHandler = AsyncHandler(async (req: Request, res: Response) => {
  const { userId } = requireAuth(req);
  const { id } = idParamSchema.parse(req.params);
  const input = createReviewSchema.parse(req.body);
  const assessment = await reviewService.submitReview(userId, id, input, getRequestContext(req));
  res.status(201).json(new ApiResponse(201, "Review submitted", { assessment }));
});

export const amendReview: RequestHandler = AsyncHandler(async (req: Request, res: Response) => {
  const { userId } = requireAuth(req);
  const { id, reviewId } = reviewParamsSchema.parse(req.params);
  const input = amendReviewSchema.parse(req.body);
  const assessment = await reviewService.amendReview(userId, id, reviewId, input, getRequestContext(req));
  res.status(200).json(new ApiResponse(200, "Review amended", { assessment }));
});
