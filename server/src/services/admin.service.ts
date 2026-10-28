import { Types, type UpdateQuery } from "mongoose";
import type { VerificationStatus } from "../constants/roles.js";
import type { DoctorProfileEntity } from "../models/doctor-profile.model.js";
import {
  findDoctorProfileByUserId,
  listDoctorProfiles,
  updateDoctorProfile,
} from "../repository/doctor-profile.repository.js";
import {
  listAuditLogs as listAuditLogsRepo,
  type AuditLogFilter,
} from "../repository/audit-log.repository.js";
import { findUserById, findUsersByIds } from "../repository/user.repository.js";
import { NotFoundError, ValidationError } from "../utils/api-error.js";
import { toPublicAuditLog, toPublicDoctorProfile } from "../utils/mappers.js";
import { buildPagination } from "../utils/pagination.js";
import { recordAudit, type RequestContext } from "./audit.service.js";
import type { Actor } from "./patient.service.js";
import * as adminOverviewService from "./admin-overview.service.js";
import { listResponderDirectory as listResponderDirectoryRepo, setResponderAuthorization } from "../repository/responder.repository.js";
import * as facilityService from "./facility.service.js";

export const listDoctors = async (
  status: VerificationStatus | undefined,
  page: number,
  limit: number,
) => {
  const { items, total } = await listDoctorProfiles(status, page, limit);
  const users = await findUsersByIds(items.map((p) => p.userId));
  const byId = new Map(users.map((u) => [String(u._id), u]));

  return {
    items: items.map((profile) => {
      const user = byId.get(String(profile.userId));
      return {
        ...toPublicDoctorProfile(profile),
        user: user
          ? {
              firstName: user.firstName,
              lastName: user.lastName,
              email: user.email,
              status: user.status,
            }
          : null,
      };
    }),
    pagination: buildPagination(page, limit, total),
  };
};

export const setDoctorVerification = async (
  admin: Actor,
  doctorUserId: string,
  input: { status: VerificationStatus; notes?: string | undefined },
  ctx: RequestContext,
) => {
  const user = await findUserById(doctorUserId);
  if (!user || user.role !== "doctor") throw new NotFoundError("Doctor not found");

  const profile = await findDoctorProfileByUserId(doctorUserId);
  if (!profile) throw new NotFoundError("Doctor profile not found");

  if (input.status === "verified" && !profile.licenseNumber) {
    throw new ValidationError("A doctor cannot be verified without a licence number", [
      { field: "status", message: "Doctor has not submitted a licence number" },
    ]);
  }

  const update: UpdateQuery<DoctorProfileEntity> =
    input.status === "pending"
      ? { $set: { verificationStatus: "pending" }, $unset: { verification: "" } }
      : {
          $set: {
            verificationStatus: input.status,
            verification: {
              reviewedBy: new Types.ObjectId(admin.userId),
              reviewedAt: new Date(),
              ...(input.notes ? { notes: input.notes } : {}),
            },
          },
        };

  const updated = await updateDoctorProfile(doctorUserId, update);
  if (!updated) throw new NotFoundError("Doctor profile not found");

  await recordAudit(
    {
      actor: admin,
      action: "doctor.verification.update",
      resourceType: "doctor",
      resourceId: doctorUserId,
      outcome: "success",
      metadata: { from: profile.verificationStatus, to: input.status },
    },
    ctx,
  );

  return toPublicDoctorProfile(updated);
};

export const listAuditLogs = async (
  filters: AuditLogFilter,
  page: number,
  limit: number,
) => {
  const { items, total } = await listAuditLogsRepo(filters, page, limit);
  return {
    items: items.map(toPublicAuditLog),
    pagination: buildPagination(page, limit, total),
  };
};

export const getOverview = adminOverviewService.getOverview;
export const verifyFacility = facilityService.setVerification;

export const listResponders = async (page: number, limit: number) => {
  const { items, total } = await listResponderDirectoryRepo(page, limit);
  return { items, pagination: buildPagination(page, limit, total) };
};

export const authorizeResponder = async (
  admin: Actor,
  responderUserId: string,
  authorized: boolean,
  ctx: RequestContext,
) => {
  const user = await findUserById(responderUserId);
  if (!user || user.role !== "responder") throw new NotFoundError("Responder not found");
  const profile = await setResponderAuthorization(responderUserId, authorized, admin.userId);
  if (!profile) throw new NotFoundError("Responder profile not found");
  await recordAudit({
    actor: admin,
    action: "responder.authorization.update",
    resourceType: "responder",
    resourceId: responderUserId,
    outcome: "success",
    metadata: { authorized },
  }, ctx);
  return {
    userId: responderUserId,
    authorized: profile.authorized,
    authorizedAt: profile.authorizedAt ?? null,
  };
};
