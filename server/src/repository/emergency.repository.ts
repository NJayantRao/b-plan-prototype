import type { QueryFilter, Types } from "mongoose";
import { EmergencyCase, type EmergencyCaseEntity } from "../models/emergency-case.model.js";

type Id = string | Types.ObjectId;

export const createEmergencyCase = async (
  data: Omit<EmergencyCaseEntity, "createdAt" | "updatedAt" | "status" | "statusEvents">,
) => {
  const now = new Date();
  const emergency = await EmergencyCase.create({
    ...data,
    status: "queued",
    statusEvents: [{ status: "queued", actorId: data.requesterId, at: now }],
  });
  return emergency.toObject() as EmergencyCaseEntity;
};

export const findEmergencyById = (id: Id) =>
  EmergencyCase.findById(id).lean<EmergencyCaseEntity>().exec();

export const listEmergencies = async (
  actorId: Id,
  role: "patient" | "responder",
  page: number,
  limit: number,
  status?: EmergencyCaseEntity["status"],
) => {
  const filter: QueryFilter<EmergencyCaseEntity> =
    role === "patient"
      ? { requesterId: actorId, ...(status ? { status } : {}) }
      : {
          $or: [{ status: "queued" }, { assignedResponderId: actorId }],
          ...(status ? { status } : {}),
        };
  const [items, total] = await Promise.all([
    EmergencyCase.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit)
      .lean<EmergencyCaseEntity[]>().exec(),
    EmergencyCase.countDocuments(filter).exec(),
  ]);
  return { items, total };
};

export const claimEmergency = async (id: Id, responderId: Id) => {
  const now = new Date();
  return EmergencyCase.findOneAndUpdate(
    { _id: id, status: "queued", assignedResponderId: { $exists: false } },
    {
      $set: { status: "assigned", assignedResponderId: responderId },
      $push: { statusEvents: { status: "assigned", actorId: responderId, at: now } },
    },
    { returnDocument: "after", runValidators: true },
  )
    .lean<EmergencyCaseEntity>()
    .exec();
};

export const transitionEmergency = async (
  id: Id,
  responderId: Id,
  from: EmergencyCaseEntity["status"][],
  to: EmergencyCaseEntity["status"],
) => {
  const now = new Date();
  return EmergencyCase.findOneAndUpdate(
    { _id: id, assignedResponderId: responderId, status: { $in: from } },
    {
      $set: { status: to },
      $push: { statusEvents: { status: to, actorId: responderId, at: now } },
    },
    { returnDocument: "after", runValidators: true },
  )
    .lean<EmergencyCaseEntity>()
    .exec();
};

export const cancelEmergency = async (id: Id, requesterId: Id) => {
  const now = new Date();
  return EmergencyCase.findOneAndUpdate(
    { _id: id, requesterId, status: { $in: ["queued", "assigned"] } },
    {
      $set: { status: "cancelled" },
      $push: { statusEvents: { status: "cancelled", actorId: requesterId, at: now } },
    },
    { returnDocument: "after", runValidators: true },
  )
    .lean<EmergencyCaseEntity>()
    .exec();
};

export const countEmergencyCases = () => EmergencyCase.countDocuments().exec();
export const countActiveEmergencies = () =>
  EmergencyCase.countDocuments({ status: { $in: ["queued", "assigned", "en_route"] } }).exec();
