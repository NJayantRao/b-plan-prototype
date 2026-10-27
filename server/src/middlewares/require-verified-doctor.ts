import type { NextFunction, Request, Response } from "express";
import { findDoctorProfileByUserId } from "../repository/doctor-profile.repository.js";
import { ForbiddenError } from "../utils/api-error.js";
import { requireAuth } from "./authorize.js";

/**
 * Gate for clinical actions. A doctor account alone is not enough: an admin
 * must have verified the licence. Must run after `authenticate`.
 */
const requireVerifiedDoctor = async (
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const auth = requireAuth(req);
    if (auth.role !== "doctor") {
      throw new ForbiddenError("Only verified doctors can perform this action.");
    }
    const profile = await findDoctorProfileByUserId(auth.userId);
    if (profile?.verificationStatus !== "verified") {
      throw new ForbiddenError(
        "Your doctor account is awaiting verification by an administrator.",
        "DOCTOR_NOT_VERIFIED",
      );
    }
    next();
  } catch (error) {
    next(error);
  }
};

export default requireVerifiedDoctor;
