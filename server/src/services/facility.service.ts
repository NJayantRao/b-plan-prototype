import { Types } from "mongoose";
import type { FacilityStatus } from "../constants/supporting.js";
import type { PartnerFacilityEntity } from "../models/partner-facility.model.js";
import {
  countFacilities,
  countPendingFacilities,
  createFacility,
  findFacilityById,
  listFacilities,
  updateFacilityVerification,
} from "../repository/facility.repository.js";
import { findUserById } from "../repository/user.repository.js";
import { ForbiddenError, NotFoundError } from "../utils/api-error.js";
import { buildPagination } from "../utils/pagination.js";
import { recordAudit, type RequestContext } from "./audit.service.js";
import { notify } from "./notification.service.js";
import type { Actor } from "./patient.service.js";
import type { CreateFacilityInput } from "../validators/facility.validator.js";

const present = (facility: PartnerFacilityEntity) => ({
  id: String(facility._id),
  name: facility.name,
  type: facility.type,
  address: facility.address,
  supportedServices: facility.supportedServices,
  contactPhone: facility.contactPhone ?? null,
  contactEmail: facility.contactEmail ?? null,
  verificationStatus: facility.verificationStatus,
  verification: facility.verification
    ? { reviewedAt: facility.verification.reviewedAt, notes: facility.verification.notes ?? null }
    : null,
  createdAt: facility.createdAt,
  updatedAt: facility.updatedAt,
});

export const createForPartner = async (
  actor: Actor,
  input: CreateFacilityInput,
  ctx: RequestContext,
) => {
  if (actor.role !== "partner") throw new ForbiddenError("Only partner accounts can register a facility.");
  const user = await findUserById(actor.userId);
  if (user?.role !== "partner" || user.status !== "active") {
    throw new ForbiddenError("This partner account is not active.");
  }
  const facility = await createFacility({ ...input, partnerId: new Types.ObjectId(actor.userId) });
  await recordAudit({
    actor,
    action: "facility.create",
    resourceType: "facility",
    resourceId: String(facility._id),
    outcome: "success",
    metadata: { type: facility.type },
  }, ctx);
  return present(facility);
};

export const listVisibleFacilities = async (
  actor: Actor,
  query: {
    page: number;
    limit: number;
    city?: string | undefined;
    state?: string | undefined;
    type?: PartnerFacilityEntity["type"] | undefined;
  },
) => {
  const allowed =
    actor.role === "patient" || actor.role === "doctor" || actor.role === "partner" || actor.role === "admin";
  if (!allowed) throw new ForbiddenError("You cannot access facilities.");
  const { items, total } = await listFacilities({
    page: query.page,
    limit: query.limit,
    ...(query.city !== undefined ? { city: query.city } : {}),
    ...(query.state !== undefined ? { state: query.state } : {}),
    ...(query.type !== undefined ? { type: query.type } : {}),
    ...(actor.role === "admin"
      ? { includeUnverified: true }
      : actor.role === "partner"
        ? { partnerId: actor.userId }
        : {}),
  });
  return {
    items: items.map(present),
    pagination: buildPagination(query.page, query.limit, total),
  };
};

export const setVerification = async (
  actor: Actor,
  id: string,
  input: { status: FacilityStatus; notes?: string | undefined },
  ctx: RequestContext,
) => {
  if (actor.role !== "admin") throw new ForbiddenError("Only administrators can verify facilities.");
  const existing = await findFacilityById(id);
  if (!existing) throw new NotFoundError("Facility not found");
  const updated = await updateFacilityVerification(
    id,
    input.status,
    input.status === "pending"
      ? undefined
      : {
          reviewedBy: new Types.ObjectId(actor.userId),
          reviewedAt: new Date(),
          ...(input.notes ? { notes: input.notes } : {}),
        },
  );
  if (!updated) throw new NotFoundError("Facility not found");
  await notify(String(updated.partnerId), "facility", `Facility ${input.status}`, `Your facility verification status is now ${input.status}.`);
  await recordAudit({
    actor,
    action: "facility.verification.update",
    resourceType: "facility",
    resourceId: id,
    outcome: "success",
    metadata: { from: existing.verificationStatus, to: input.status },
  }, ctx);
  return present(updated);
};

export const getCounts = async () => ({
  total: await countFacilities(),
  pending: await countPendingFacilities(),
});
