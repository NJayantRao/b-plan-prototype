import type { Request, RequestHandler, Response } from "express";
import { requireAuth } from "../middlewares/authorize.js";
import { getRequestContext } from "../services/audit.service.js";
import * as patientService from "../services/patient.service.js";
import ApiResponse from "../utils/api-response.js";
import AsyncHandler from "../utils/async-handler.js";
import { toPublicPatientProfile, toPublicUser } from "../utils/mappers.js";
import { idParamSchema } from "../validators/common.validator.js";
import { updatePatientProfileSchema } from "../validators/patient.validator.js";

type ProfileView = Awaited<ReturnType<typeof patientService.getMyPatientProfile>>;

const present = ({ user, profile }: ProfileView) => ({
  user: toPublicUser(user),
  profile: toPublicPatientProfile(profile),
});

export const getMyProfile: RequestHandler = AsyncHandler(
  async (req: Request, res: Response) => {
    const { userId } = requireAuth(req);
    const view = await patientService.getMyPatientProfile(userId);
    res.status(200).json(new ApiResponse(200, "Patient profile", present(view)));
  },
);

export const updateMyProfile: RequestHandler = AsyncHandler(
  async (req: Request, res: Response) => {
    const { userId } = requireAuth(req);
    const input = updatePatientProfileSchema.parse(req.body);
    const view = await patientService.updateMyPatientProfile(
      userId,
      input,
      getRequestContext(req),
    );
    res.status(200).json(new ApiResponse(200, "Profile updated", present(view)));
  },
);

export const getPatientById: RequestHandler = AsyncHandler(
  async (req: Request, res: Response) => {
    const actor = requireAuth(req);
    const { id } = idParamSchema.parse(req.params);
    const view = await patientService.getPatientProfileFor(
      actor,
      id,
      getRequestContext(req),
    );
    res.status(200).json(new ApiResponse(200, "Patient profile", present(view)));
  },
);
