import type { Request, RequestHandler, Response } from "express";
import { requireAuth } from "../middlewares/authorize.js";
import { getRequestContext } from "../services/audit.service.js";
import * as appointmentService from "../services/appointment.service.js";
import * as doctorService from "../services/doctor.service.js";
import ApiResponse from "../utils/api-response.js";
import AsyncHandler from "../utils/async-handler.js";
import { toPublicDoctorProfile } from "../utils/mappers.js";
import {
  doctorAvailabilityQuerySchema,
  doctorDirectoryQuerySchema,
  doctorIdParamSchema,
} from "../validators/appointment.validator.js";
import { updateDoctorProfileSchema } from "../validators/doctor.validator.js";

export const getMyProfile: RequestHandler = AsyncHandler(
  async (req: Request, res: Response) => {
    const { userId } = requireAuth(req);
    const profile = await doctorService.getMyDoctorProfile(userId);
    res.status(200).json(
      new ApiResponse(200, "Doctor profile", { profile: toPublicDoctorProfile(profile) }),
    );
  },
);

export const updateMyProfile: RequestHandler = AsyncHandler(
  async (req: Request, res: Response) => {
    const { userId } = requireAuth(req);
    const input = updateDoctorProfileSchema.parse(req.body);
    const profile = await doctorService.updateMyDoctorProfile(
      userId,
      input,
      getRequestContext(req),
    );
    res.status(200).json(
      new ApiResponse(200, "Profile updated", { profile: toPublicDoctorProfile(profile) }),
    );
  },
);

export const listDirectory: RequestHandler = AsyncHandler(
  async (req: Request, res: Response) => {
    const query = doctorDirectoryQuerySchema.parse(req.query);
    const data = await appointmentService.listPublicDoctors(query);
    res.status(200).json(new ApiResponse(200, "Verified doctors", data));
  },
);

export const getPublicProfile: RequestHandler = AsyncHandler(
  async (req: Request, res: Response) => {
    const { id } = doctorIdParamSchema.parse(req.params);
    const doctor = await appointmentService.getPublicDoctor(id);
    res.status(200).json(new ApiResponse(200, "Doctor", { doctor }));
  },
);

export const getAvailability: RequestHandler = AsyncHandler(
  async (req: Request, res: Response) => {
    const { id } = doctorIdParamSchema.parse(req.params);
    const query = doctorAvailabilityQuerySchema.parse(req.query);
    const from = query.from ? new Date(`${query.from}T00:00:00.000Z`) : new Date();
    const availability = await appointmentService.getDoctorAvailability(id, from, query.days);
    res.status(200).json(new ApiResponse(200, "Doctor availability", { availability }));
  },
);
