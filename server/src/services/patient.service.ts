import type { UpdateQuery } from "mongoose";
import { CONSENT_VERSION, type Role } from "../constants/roles.js";
import type { PatientProfileEntity } from "../models/patient-profile.model.js";
import {
  getOrCreatePatientProfile,
  updatePatientProfile,
} from "../repository/patient-profile.repository.js";
import { doctorIsPrimaryFor } from "../repository/assessment.repository.js";
import { doctorIsSecondOpinionFor } from "../repository/second-opinion.repository.js";
import { findUserById } from "../repository/user.repository.js";
import { ForbiddenError, NotFoundError } from "../utils/api-error.js";
import type { UpdatePatientProfileInput } from "../validators/patient.validator.js";
import { recordAudit, type RequestContext } from "./audit.service.js";
import { isVerifiedDoctor } from "./doctor-access.service.js";

export interface Actor {
  userId: string;
  role: Role;
}

type PatientAccess = "self" | "admin" | "doctor";

/**
 * Decides whether `actor` may read `patientUserId`'s record.
 * - the patient themselves: yes
 * - admins: yes, but every read is audited
 * - doctors: only a VERIFIED doctor who is currently treating this patient,
 *   i.e. they claimed one of the patient's assessments, or were assigned its
 *   second opinion. Every such read is audited. Being a doctor is not enough.
 */
const resolvePatientAccess = async (
  actor: Actor,
  patientUserId: string,
): Promise<PatientAccess | null> => {
  if (actor.userId === patientUserId) return "self";
  if (actor.role === "admin") return "admin";
  if (actor.role === "doctor" && (await isVerifiedDoctor(actor.userId))) {
    const treating =
      (await doctorIsPrimaryFor(actor.userId, patientUserId)) ||
      (await doctorIsSecondOpinionFor(actor.userId, patientUserId));
    if (treating) return "doctor";
  }
  return null;
};

const buildProfileView = async (patientUserId: string) => {
  const [user, profile] = await Promise.all([
    findUserById(patientUserId),
    getOrCreatePatientProfile(patientUserId),
  ]);
  if (!user || user.role !== "patient" || !profile) {
    throw new NotFoundError("Patient not found");
  }
  return { user, profile };
};

export const getMyPatientProfile = (userId: string) => buildProfileView(userId);

export const getPatientProfileFor = async (
  actor: Actor,
  patientUserId: string,
  ctx: RequestContext,
) => {
  const access = await resolvePatientAccess(actor, patientUserId);

  if (!access) {
    await recordAudit(
      {
        actor,
        action: "patient.record.view",
        resourceType: "patient",
        resourceId: patientUserId,
        outcome: "denied",
      },
      ctx,
    );
    throw new ForbiddenError("You do not have access to this patient's records.");
  }

  // Existence is only revealed after the access check has passed.
  const view = await buildProfileView(patientUserId);

  if (access === "admin" || access === "doctor") {
    await recordAudit(
      {
        actor,
        action: "patient.record.view",
        resourceType: "patient",
        resourceId: patientUserId,
        outcome: "success",
      },
      ctx,
    );
  }
  return view;
};

export const updateMyPatientProfile = async (
  userId: string,
  input: UpdatePatientProfileInput,
  ctx: RequestContext,
) => {
  const current = await getOrCreatePatientProfile(userId);
  if (!current) throw new NotFoundError("Patient profile not found");

  const $set: Record<string, unknown> = {};
  const $unset: Record<string, ""> = {};

  const optionalFields = ["dateOfBirth", "gender", "location"] as const;
  for (const field of optionalFields) {
    const value = input[field];
    if (value === null) $unset[field] = "";
    else if (value !== undefined) $set[field] = value;
  }

  if (input.allergies !== undefined) $set["allergies"] = input.allergies;
  if (input.currentMedications !== undefined) {
    $set["currentMedications"] = input.currentMedications;
  }
  if (input.medicalHistory !== undefined) $set["medicalHistory"] = input.medicalHistory;

  if (input.consents !== undefined) {
    const now = new Date();
    const merged = new Map((current.consents ?? []).map((c) => [c.type, c]));
    for (const change of input.consents) {
      merged.set(change.type, {
        type: change.type,
        granted: change.granted,
        version: CONSENT_VERSION,
        updatedAt: now,
      });
    }
    $set["consents"] = [...merged.values()];
  }

  const changedFields = [...Object.keys($set), ...Object.keys($unset)];
  if (changedFields.length === 0) return buildProfileView(userId);

  const update: UpdateQuery<PatientProfileEntity> = {
    ...(Object.keys($set).length > 0 ? { $set } : {}),
    ...(Object.keys($unset).length > 0 ? { $unset } : {}),
  };
  const updated = await updatePatientProfile(userId, update);
  if (!updated) throw new NotFoundError("Patient profile not found");

  await recordAudit(
    {
      actor: { userId, role: "patient" },
      action: "patient.profile.update",
      resourceType: "patient",
      resourceId: userId,
      outcome: "success",
      metadata: { fields: changedFields }, // field names only, never values
    },
    ctx,
  );

  return buildProfileView(userId);
};
