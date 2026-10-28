import type { Request, RequestHandler, Response } from "express";
import { requireAuth } from "../middlewares/authorize.js";
import * as adminService from "../services/admin.service.js";
import { getRequestContext } from "../services/audit.service.js";
import ApiResponse from "../utils/api-response.js";
import AsyncHandler from "../utils/async-handler.js";
import {
  listAuditLogsQuerySchema,
  listDoctorsQuerySchema,
  setVerificationSchema,
} from "../validators/admin.validator.js";
import { idParamSchema } from "../validators/common.validator.js";
import {
  setResponderAuthorizationSchema,
  verifyFacilitySchema,
} from "../validators/facility.validator.js";
import { paginationSchema } from "../utils/pagination.js";

export const listDoctors: RequestHandler = AsyncHandler(
  async (req: Request, res: Response) => {
    const { status, page, limit } = listDoctorsQuerySchema.parse(req.query);
    const data = await adminService.listDoctors(status, page, limit);
    res.status(200).json(new ApiResponse(200, "Doctors", data));
  },
);

export const getOverview: RequestHandler = AsyncHandler(
  async (_req: Request, res: Response) => {
    const data = await adminService.getOverview();
    res.status(200).json(new ApiResponse(200, "Admin overview", data));
  },
);

export const listResponders: RequestHandler = AsyncHandler(
  async (req: Request, res: Response) => {
    const { page, limit } = paginationSchema.parse(req.query);
    const data = await adminService.listResponders(page, limit);
    res.status(200).json(new ApiResponse(200, "Responders", data));
  },
);

export const setDoctorVerification: RequestHandler = AsyncHandler(
  async (req: Request, res: Response) => {
    const admin = requireAuth(req);
    const { id } = idParamSchema.parse(req.params);
    const input = setVerificationSchema.parse(req.body);
    const profile = await adminService.setDoctorVerification(
      admin,
      id,
      input,
      getRequestContext(req),
    );
    res
      .status(200)
      .json(new ApiResponse(200, "Verification updated", { profile }));
  },
);

export const listAuditLogs: RequestHandler = AsyncHandler(
  async (req: Request, res: Response) => {
    const { page, limit, ...filters } = listAuditLogsQuerySchema.parse(req.query);
    const data = await adminService.listAuditLogs(filters, page, limit);
    res.status(200).json(new ApiResponse(200, "Audit logs", data));
  },
);

export const verifyFacility: RequestHandler = AsyncHandler(
  async (req: Request, res: Response) => {
    const admin = requireAuth(req);
    const { id } = idParamSchema.parse(req.params);
    const input = verifyFacilitySchema.parse(req.body);
    const facility = await adminService.verifyFacility(admin, id, input, getRequestContext(req));
    res.status(200).json(new ApiResponse(200, "Facility verification updated", { facility }));
  },
);

export const authorizeResponder: RequestHandler = AsyncHandler(
  async (req: Request, res: Response) => {
    const admin = requireAuth(req);
    const { id } = idParamSchema.parse(req.params);
    const { authorized } = setResponderAuthorizationSchema.parse(req.body);
    const responder = await adminService.authorizeResponder(admin, id, authorized, getRequestContext(req));
    res.status(200).json(new ApiResponse(200, "Responder authorization updated", { responder }));
  },
);
