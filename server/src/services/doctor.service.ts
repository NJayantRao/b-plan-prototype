import type { UpdateQuery } from "mongoose";
import type { DoctorProfileEntity } from "../models/doctor-profile.model.js";
import {
  getOrCreateDoctorProfile,
  updateDoctorProfile,
} from "../repository/doctor-profile.repository.js";
import { NotFoundError } from "../utils/api-error.js";
import type { UpdateDoctorProfileInput } from "../validators/doctor.validator.js";
import { recordAudit, type RequestContext } from "./audit.service.js";

export const getMyDoctorProfile = async (userId: string) => {
  const profile = await getOrCreateDoctorProfile(userId);
  if (!profile) throw new NotFoundError("Doctor profile not found");
  return profile;
};

export const updateMyDoctorProfile = async (
  userId: string,
  input: UpdateDoctorProfileInput,
  ctx: RequestContext,
) => {
  const current = await getMyDoctorProfile(userId);

  const $set: Record<string, unknown> = {};
  const fields = [
    "specialties",
    "qualifications",
    "licenseNumber",
    "registrationCouncil",
    "yearsOfExperience",
    "bio",
    "consultationFee",
  ] as const;
  for (const field of fields) {
    if (input[field] !== undefined) $set[field] = input[field];
  }

  const update: UpdateQuery<DoctorProfileEntity> = { $set };

  // Verification is tied to the licence on file. Changing the licence number
  // of a verified doctor sends the profile back to the admin review queue.
  const licenceChanged =
    input.licenseNumber !== undefined &&
    input.licenseNumber !== current.licenseNumber;
  const resetVerification = licenceChanged && current.verificationStatus === "verified";
  if (resetVerification) {
    $set["verificationStatus"] = "pending";
    update.$unset = { verification: "" };
  }

  if (Object.keys($set).length === 0) return current;

  const updated = await updateDoctorProfile(userId, update);
  if (!updated) throw new NotFoundError("Doctor profile not found");

  await recordAudit(
    {
      actor: { userId, role: "doctor" },
      action: "doctor.profile.update",
      resourceType: "doctor",
      resourceId: userId,
      outcome: "success",
      metadata: { fields: Object.keys($set), verificationReset: resetVerification },
    },
    ctx,
  );
  return updated;
};
