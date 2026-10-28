import type { Request, RequestHandler, Response } from "express";
import { requireAuth } from "../middlewares/authorize.js";
import { getRequestContext } from "../services/audit.service.js";
import * as carePlanService from "../services/care-plan.service.js";
import ApiResponse from "../utils/api-response.js";
import AsyncHandler from "../utils/async-handler.js";
import { idParamSchema } from "../validators/common.validator.js";
import {
  createCarePlanSchema,
  doctorTaskPatchSchema,
  listCarePlansQuerySchema,
  patientTaskPatchSchema,
  taskParamsSchema,
} from "../validators/care-plan.validator.js";

export const create: RequestHandler = AsyncHandler(async (req: Request, res: Response) => {
  const { userId } = requireAuth(req);
  const input = createCarePlanSchema.parse(req.body);
  const carePlan = await carePlanService.createPlanForDoctor(userId, input, getRequestContext(req));
  res.status(201).json(new ApiResponse(201, "Care plan created", { carePlan }));
});

export const list: RequestHandler = AsyncHandler(async (req: Request, res: Response) => {
  const actor = requireAuth(req);
  const query = listCarePlansQuerySchema.parse(req.query);
  const data = await carePlanService.listCarePlans(actor, query);
  res.status(200).json(new ApiResponse(200, "Care plans", data));
});

export const getOne: RequestHandler = AsyncHandler(async (req: Request, res: Response) => {
  const actor = requireAuth(req);
  const { id } = idParamSchema.parse(req.params);
  const carePlan = await carePlanService.getCarePlan(actor, id);
  res.status(200).json(new ApiResponse(200, "Care plan", { carePlan }));
});

export const updateTask: RequestHandler = AsyncHandler(async (req: Request, res: Response) => {
  const actor = requireAuth(req);
  const { id, taskId } = taskParamsSchema.parse(req.params);
  // Patients may only report progress; the plan's doctor may also edit the task.
  const patch =
    actor.role === "doctor"
      ? doctorTaskPatchSchema.parse(req.body)
      : patientTaskPatchSchema.parse(req.body);
  const carePlan = await carePlanService.updateTask(actor, id, taskId, patch, getRequestContext(req));
  res.status(200).json(new ApiResponse(200, "Task updated", { carePlan }));
});
