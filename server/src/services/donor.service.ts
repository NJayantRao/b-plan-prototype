import { Types } from "mongoose";
import type { BloodGroup } from "../constants/supporting.js";
import {
  countDonorProfiles,
  countOpenDonorRequests,
  createDonorRequest,
  findDonorProfileByUserId,
  findDonorRequestById,
  findMatchingDonors,
  listDonorRequests,
  updateDonorRequest,
  upsertDonorProfile,
  searchMatchingDonors,
} from "../repository/donor.repository.js";
import { findUserById } from "../repository/user.repository.js";
import type { DonorProfileEntity } from "../models/donor-profile.model.js";
import type { DonorRequestEntity } from "../models/donor-request.model.js";
import { ForbiddenError, NotFoundError } from "../utils/api-error.js";
import { buildPagination } from "../utils/pagination.js";
import { recordAudit, type RequestContext } from "./audit.service.js";
import { notify } from "./notification.service.js";
import type { Actor } from "./patient.service.js";
import type {
  CreateDonorRequestInput,
  DonorProfileInput,
  DonorSearchInput,
} from "../validators/donor.validator.js";

const COMPATIBLE_DONORS: Record<BloodGroup, BloodGroup[]> = {
  "A+": ["A+", "A-", "O+", "O-"],
  "A-": ["A-", "O-"],
  "B+": ["B+", "B-", "O+", "O-"],
  "B-": ["B-", "O-"],
  "AB+": ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
  "AB-": ["A-", "B-", "AB-", "O-"],
  "O+": ["O+", "O-"],
  "O-": ["O-"],
};

const presentDonorRequest = (request: DonorRequestEntity) => ({
  id: String(request._id),
  donationType: request.donationType,
  bloodGroup: request.bloodGroup ?? null,
  city: request.city,
  state: request.state,
  status: request.status,
  matchedDonorCount: request.matchedDonorIds.length,
  simulationNotice: "Matches are synthetic platform records. No donor has been contacted.",
  createdAt: request.createdAt,
  updatedAt: request.updatedAt,
});

export const registerDonor = async (
  actor: Actor,
  input: DonorProfileInput,
  ctx: RequestContext,
) => {
  if (actor.role !== "patient") throw new ForbiddenError("Only patient accounts can register as donors.");
  const updated = await upsertDonorProfile(actor.userId, input);
  if (!updated) throw new NotFoundError("Donor registration could not be saved");
  await recordAudit({
    actor,
    action: "donor.profile.update",
    resourceType: "donor_profile",
    resourceId: String(updated._id),
    outcome: "success",
    metadata: {
      donationTypes: updated.donationTypes,
      available: updated.available,
      consentGranted: updated.consentGranted,
    },
  }, ctx);
  return {
    id: String(updated._id),
    donationTypes: updated.donationTypes,
    bloodGroup: updated.bloodGroup ?? null,
    city: updated.city,
    state: updated.state,
    available: updated.available,
    consentGranted: updated.consentGranted,
    updatedAt: updated.updatedAt,
  };
};

export const getMyDonorProfile = async (actor: Actor) => {
  const profile = await findDonorProfileByUserId(actor.userId);
  if (!profile) return null;
  return {
    id: String(profile._id),
    donationTypes: profile.donationTypes,
    bloodGroup: profile.bloodGroup ?? null,
    city: profile.city,
    state: profile.state,
    available: profile.available,
    consentGranted: profile.consentGranted,
    updatedAt: profile.updatedAt,
  };
};

export const searchDonors = async (
  actor: Actor,
  query: DonorSearchInput,
) => {
  if (actor.role !== "patient") throw new ForbiddenError("Only patients can search donor availability.");
  const { items, total } = await searchMatchingDonors({
    donationType: query.donationType,
    ...(query.bloodGroup ? { compatibleBloodGroups: COMPATIBLE_DONORS[query.bloodGroup] } : {}),
    city: query.city,
    state: query.state,
  }, query.page, query.limit);
  const donors = items.map((donor) => ({
    donationTypes: donor.donationTypes,
    bloodGroup: donor.bloodGroup ?? null,
    city: donor.city,
    state: donor.state,
    available: true as const,
  }));
  return {
    items: donors,
    pagination: buildPagination(query.page, query.limit, total),
    simulationNotice: "Availability is synthetic and consented. Donor names and contact details are not exposed and no donor has been contacted.",
  };
};

export const createRequest = async (
  actor: Actor,
  input: CreateDonorRequestInput,
  ctx: RequestContext,
) => {
  if (actor.role !== "patient") throw new ForbiddenError("Only patients can request a donor match.");
  const user = await findUserById(actor.userId);
  if (user?.role !== "patient") throw new ForbiddenError("Only patient accounts can request donor matches.");
  const bloodGroups = input.bloodGroup ? COMPATIBLE_DONORS[input.bloodGroup] : undefined;
  const matches = await findMatchingDonors({
    donationType: input.donationType,
    ...(bloodGroups ? { compatibleBloodGroups: bloodGroups } : {}),
    city: input.city,
    state: input.state,
  });
  const request = await createDonorRequest({
    requesterId: new Types.ObjectId(actor.userId),
    donationType: input.donationType,
    ...(input.bloodGroup ? { bloodGroup: input.bloodGroup } : {}),
    city: input.city,
    state: input.state,
    matchedDonorIds: matches.map((donor) => donor._id),
  });
  await notify(actor.userId, "donor_request", "Donor request matched", `${matches.length} consented synthetic donor record(s) match your request. No donor has been contacted.`);
  await recordAudit({
    actor,
    action: "donor.request.create",
    resourceType: "donor_request",
    resourceId: String(request._id),
    outcome: "success",
    metadata: { donationType: request.donationType, matchCount: matches.length },
  }, ctx);
  return presentDonorRequest(request);
};

export const listRequests = async (
  actor: Actor,
  page: number,
  limit: number,
  status?: DonorRequestEntity["status"],
) => {
  if (actor.role !== "patient") throw new ForbiddenError("Only patients can view donor requests.");
  const { items, total } = await listDonorRequests(actor.userId, page, limit, status);
  return { items: items.map(presentDonorRequest), pagination: buildPagination(page, limit, total) };
};

export const updateRequest = async (
  actor: Actor,
  id: string,
  status: "cancelled" | "fulfilled",
  ctx: RequestContext,
) => {
  if (actor.role !== "patient") throw new ForbiddenError("Only patients can update donor requests.");
  const existing = await findDonorRequestById(id);
  if (!existing || String(existing.requesterId) !== actor.userId) {
    throw new NotFoundError("Donor request not found");
  }
  const updated = await updateDonorRequest(id, { status });
  if (!updated) throw new NotFoundError("Donor request is no longer open");
  await notify(actor.userId, "donor_request", `Donor request ${status}`, "The request status changed in the prototype; no donor was contacted.");
  await recordAudit({
    actor,
    action: "donor.request.status.update",
    resourceType: "donor_request",
    resourceId: id,
    outcome: "success",
    metadata: { from: existing.status, to: status },
  }, ctx);
  return presentDonorRequest(updated);
};

export const getCounts = async () => ({
  registeredDonors: await countDonorProfiles(),
  openDonorRequests: await countOpenDonorRequests(),
});
