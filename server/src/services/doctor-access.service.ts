import { findDoctorProfileByUserId } from "../repository/doctor-profile.repository.js";
import { ForbiddenError } from "../utils/api-error.js";

export const isVerifiedDoctor = async (userId: string): Promise<boolean> =>
  (await findDoctorProfileByUserId(userId))?.verificationStatus === "verified";

/** For endpoints shared by several roles, where route middleware can't gate doctors alone. */
export const assertVerifiedDoctor = async (userId: string): Promise<void> => {
  if (!(await isVerifiedDoctor(userId))) {
    throw new ForbiddenError(
      "Your doctor account is awaiting verification by an administrator.",
      "DOCTOR_NOT_VERIFIED",
    );
  }
};
