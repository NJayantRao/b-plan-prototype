import type { UpdateQuery } from "mongoose";
import { CONSENT_VERSION, type Role } from "../constants/roles.js";
import type { PatientProfileEntity } from "../models/patient-profile.model.js";
import {
  getOrCreatePatientProfile,
  updatePatientProfile,
} from "../repository/patient-profile.repository.js";
import { findUserById } from "../repository/user.repository.js";
import { ForbiddenError, NotFoundError } from "../utils/api-error.js";
import type { UpdatePatientProfileInput } from "../validators/patient.validator.js";
import { recordAudit, type RequestContext } from "./audit.service.js";

export interface Actor {
  userId: string;
  role: Role;
}

type PatientAccess = "self" | "admin";

/**
 * Decides whether `actor` may read `patientUserId`'s record.
 * - the patient themselves: yes
 * - admins: yes, but every read is audited
 * - doctors: NOT yet. A doctor may only see patients they are authorised to
 *   review; that relationship (assignment / appointment / second opinion)
 *   arrives with the assessment models in Phase 3, so access is denied until
 *   then rather than granted by role alone.
 */
const resolvePatientAccess = (
  actor: Actor,
  patientUserId: string,
): PatientAccess | null => {
  if (actor.userId === patientUserId) return "self";
  if (actor.role === "admin") return "admin";
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
  const access = resolvePatientAccess(actor, patientUserId);

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

  if (access === "admin") {
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
