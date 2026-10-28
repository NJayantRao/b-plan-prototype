import { Types } from "mongoose";
import type { EmergencyCaseEntity } from "../models/emergency-case.model.js";
import type { EmergencyStatus } from "../constants/supporting.js";
import {
  cancelEmergency,
  claimEmergency,
  countActiveEmergencies,
  countEmergencyCases,
  createEmergencyCase,
  findEmergencyById,
  listEmergencies,
  transitionEmergency,
} from "../repository/emergency.repository.js";
import { findResponderProfile } from "../repository/responder.repository.js";
import { findUserById } from "../repository/user.repository.js";
import { ConflictError, ForbiddenError, NotFoundError } from "../utils/api-error.js";
import { buildPagination } from "../utils/pagination.js";
import { recordAudit, type RequestContext } from "./audit.service.js";
import { notify } from "./notification.service.js";
import type { Actor } from "./patient.service.js";

const present = (caseFile: EmergencyCaseEntity, includeAddress: boolean) => ({
  id: String(caseFile._id),
  location: {
    city: caseFile.location.city,
    state: caseFile.location.state,
    ...(includeAddress && caseFile.location.address ? { address: caseFile.location.address } : {}),
  },
  urgency: caseFile.urgency,
  description: caseFile.description,
  assignedResponder: caseFile.assignedResponderId ? String(caseFile.assignedResponderId) : null,
  status: caseFile.status,
  estimatedArrivalMinutes: caseFile.estimatedArrivalMinutes,
  simulated: caseFile.simulated,
  simulationNotice: "Simulation only. No ambulance, emergency service, hospital, or responder has been contacted.",
  statusEvents: caseFile.statusEvents.map((event) => ({
    status: event.status,
    at: event.at,
    ...(String(event.actorId) === String(caseFile.requesterId) ? { actor: "requester" as const } : { actor: "responder" as const }),
  })),
  createdAt: caseFile.createdAt,
  updatedAt: caseFile.updatedAt,
});

const estimatedArrivalFor = (id: Types.ObjectId, urgency: "urgent" | "critical") =>
  (urgency === "critical" ? 5 : 10) + (Number.parseInt(String(id).slice(-2), 16) % 11);

export const createCase = async (
  actor: Actor,
  input: { location: { city: string; state: string; address?: string | undefined }; urgency: "urgent" | "critical"; description: string },
  ctx: RequestContext,
) => {
  if (actor.role !== "patient") throw new ForbiddenError("Only patients can create a simulated emergency case.");
  const requester = await findUserById(actor.userId);
  if (requester?.role !== "patient") throw new ForbiddenError("Only patient accounts can create emergency cases.");
  const id = new Types.ObjectId();
  const created = await createEmergencyCase({
    _id: id,
    requesterId: new Types.ObjectId(actor.userId),
    location: {
      city: input.location.city,
      state: input.location.state,
      ...(input.location.address ? { address: input.location.address } : {}),
    },
    urgency: input.urgency,
    description: input.description,
    estimatedArrivalMinutes: estimatedArrivalFor(id, input.urgency),
    simulated: true,
  });
  await notify(actor.userId, "emergency", "Simulated emergency created", "This prototype has recorded a simulated case only. No emergency service was contacted.");
  await recordAudit({
    actor,
    action: "emergency.create",
    resourceType: "emergency_case",
    resourceId: String(created._id),
    outcome: "success",
    metadata: { urgency: created.urgency, simulated: true },
  }, ctx);
  return present(created, true);
};

export const listCases = async (
  actor: Actor,
  page: number,
  limit: number,
  status?: EmergencyStatus,
) => {
  if (actor.role !== "patient" && actor.role !== "responder") {
    throw new ForbiddenError("Only patients and authorized responders can view emergency cases.");
  }
  if (actor.role === "responder") await assertAuthorizedResponder(actor.userId);
  const { items, total } = await listEmergencies(actor.userId, actor.role, page, limit, status);
  return {
    items: items.map((item) => present(item, actor.role === "patient" || String(item.assignedResponderId) === actor.userId)),
    pagination: buildPagination(page, limit, total),
    simulationNotice: "All emergency cases and dispatch states in this prototype are simulated.",
  };
};

const assertAuthorizedResponder = async (userId: string) => {
  const [user, profile] = await Promise.all([findUserById(userId), findResponderProfile(userId)]);
  if (user?.role !== "responder" || !profile?.authorized) {
    throw new ForbiddenError("This responder account has not been authorized.", "RESPONDER_NOT_AUTHORIZED");
  }
};

export const getCase = async (actor: Actor, id: string, ctx: RequestContext) => {
  const emergency = await findEmergencyById(id);
  if (!emergency) throw new NotFoundError("Emergency case not found");
  let permitted = actor.role === "patient" && String(emergency.requesterId) === actor.userId;
  if (actor.role === "responder") {
    await assertAuthorizedResponder(actor.userId);
    permitted = String(emergency.assignedResponderId) === actor.userId;
  }
  if (!permitted) {
    await recordAudit({
      actor,
      action: "emergency.view",
      resourceType: "emergency_case",
      resourceId: id,
      outcome: "denied",
    }, ctx);
    throw new NotFoundError("Emergency case not found");
  }
  await recordAudit({
    actor,
    action: "emergency.view",
    resourceType: "emergency_case",
    resourceId: id,
    outcome: "success",
  }, ctx);
  return present(emergency, actor.role === "patient" || String(emergency.assignedResponderId) === actor.userId);
};

export const claimCase = async (actor: Actor, id: string, ctx: RequestContext) => {
  if (actor.role !== "responder") throw new ForbiddenError("Only responders can claim an emergency.");
  await assertAuthorizedResponder(actor.userId);
  const claimed = await claimEmergency(id, actor.userId);
  if (!claimed) {
    if (!(await findEmergencyById(id))) throw new NotFoundError("Emergency case not found");
    throw new ConflictError("This case is no longer available.", "EMERGENCY_ALREADY_ASSIGNED");
  }
  await notify(String(claimed.requesterId), "emergency", "Simulated responder assigned", "A test responder account has been assigned in the prototype. This is not a real emergency dispatch.");
  await recordAudit({
    actor,
    action: "emergency.claim",
    resourceType: "emergency_case",
    resourceId: id,
    outcome: "success",
    metadata: { simulated: true },
  }, ctx);
  return present(claimed, true);
};

export const updateStatus = async (
  actor: Actor,
  id: string,
  status: "en_route" | "arrived" | "completed" | "cancelled",
  ctx: RequestContext,
) => {
  if (actor.role === "patient" && status === "cancelled") {
    const updated = await cancelEmergency(id, actor.userId);
    if (!updated) throw new NotFoundError("Active emergency case not found");
    await recordAudit({
      actor,
      action: "emergency.status.update",
      resourceType: "emergency_case",
      resourceId: id,
      outcome: "success",
      metadata: { to: status, simulated: true },
    }, ctx);
    return present(updated, true);
  }
  if (actor.role !== "responder" || status === "cancelled") {
    throw new ForbiddenError("You cannot make that emergency status change.");
  }
  await assertAuthorizedResponder(actor.userId);
  const transitions: Record<"en_route" | "arrived" | "completed", EmergencyCaseEntity["status"][]> = {
    en_route: ["assigned"],
    arrived: ["en_route"],
    completed: ["arrived"],
  };
  const updated = await transitionEmergency(id, actor.userId, transitions[status], status);
  if (!updated) {
    const existing = await findEmergencyById(id);
    if (!existing || String(existing.assignedResponderId) !== actor.userId) {
      throw new NotFoundError("Emergency case not found");
    }
    throw new ConflictError("This status transition is not available.", "EMERGENCY_TRANSITION_INVALID");
  }
  await notify(String(updated.requesterId), "emergency", `Simulated status: ${status.replace("_", " ")}`, "Emergency status updated in the prototype. No real-world service has been contacted.");
  await recordAudit({
    actor,
    action: "emergency.status.update",
    resourceType: "emergency_case",
    resourceId: id,
    outcome: "success",
    metadata: { to: status, simulated: true },
  }, ctx);
  return present(updated, true);
};

export const getCounts = async () => ({
  total: await countEmergencyCases(),
  active: await countActiveEmergencies(),
});
