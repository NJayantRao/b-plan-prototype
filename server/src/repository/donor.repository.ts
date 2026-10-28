import type { QueryFilter, Types } from "mongoose";
import { DonorProfile, type DonorProfileEntity } from "../models/donor-profile.model.js";
import { DonorRequest, type DonorRequestEntity } from "../models/donor-request.model.js";
import type { DonationType } from "../constants/supporting.js";
import type { BloodGroup } from "../constants/supporting.js";

type Id = string | Types.ObjectId;

export const findDonorProfileByUserId = (userId: Id) =>
  DonorProfile.findOne({ userId }).lean<DonorProfileEntity>().exec();

export const upsertDonorProfile = async (
  userId: Id,
  fields: Omit<DonorProfileEntity, "_id" | "userId" | "createdAt" | "updatedAt" | "bloodGroup"> & {
    bloodGroup?: DonorProfileEntity["bloodGroup"] | undefined;
  },
) =>
  DonorProfile.findOneAndUpdate(
    { userId },
    { $set: fields, $setOnInsert: { userId } },
    { upsert: true, returnDocument: "after", runValidators: true },
  )
    .lean<DonorProfileEntity>()
    .exec();

export const findMatchingDonors = (filter: {
  donationType: DonationType;
  compatibleBloodGroups?: BloodGroup[];
  city: string;
  state: string;
}) => {
  const query: QueryFilter<DonorProfileEntity> = {
    donationTypes: { $in: [filter.donationType] },
    ...(filter.compatibleBloodGroups ? { bloodGroup: { $in: filter.compatibleBloodGroups } } : {}),
    city: new RegExp(`^${filter.city.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
    state: new RegExp(`^${filter.state.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
    available: true,
    consentGranted: true,
  };
  return DonorProfile.find(query)
    .select("_id donationTypes bloodGroup city state")
    .limit(50)
    .lean<Pick<DonorProfileEntity, "_id" | "donationTypes" | "bloodGroup" | "city" | "state">[]>()
    .exec();
};

export const searchMatchingDonors = async (
  filter: {
    donationType: DonationType;
    compatibleBloodGroups?: BloodGroup[];
    city: string;
    state: string;
  },
  page: number,
  limit: number,
) => {
  const query: QueryFilter<DonorProfileEntity> = {
    donationTypes: { $in: [filter.donationType] },
    ...(filter.compatibleBloodGroups ? { bloodGroup: { $in: filter.compatibleBloodGroups } } : {}),
    city: new RegExp(`^${filter.city.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
    state: new RegExp(`^${filter.state.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
    available: true,
    consentGranted: true,
  };
  const [items, total] = await Promise.all([
    DonorProfile.find(query).select("_id donationTypes bloodGroup city state")
      .sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit)
      .lean<Pick<DonorProfileEntity, "_id" | "donationTypes" | "bloodGroup" | "city" | "state">[]>()
      .exec(),
    DonorProfile.countDocuments(query).exec(),
  ]);
  return { items, total };
};

export const createDonorRequest = async (
  data: Omit<DonorRequestEntity, "_id" | "createdAt" | "updatedAt" | "status">,
) => {
  const request = await DonorRequest.create({ ...data, status: "open" });
  return request.toObject() as DonorRequestEntity;
};

export const findDonorRequestById = (id: Id) =>
  DonorRequest.findById(id).lean<DonorRequestEntity>().exec();

export const listDonorRequests = async (
  requesterId: Id,
  page: number,
  limit: number,
  status?: DonorRequestEntity["status"],
) => {
  const filter = { requesterId, ...(status ? { status } : {}) };
  const [items, total] = await Promise.all([
    DonorRequest.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit)
      .lean<DonorRequestEntity[]>().exec(),
    DonorRequest.countDocuments(filter).exec(),
  ]);
  return { items, total };
};

export const updateDonorRequest = (
  id: Id,
  update: Record<string, unknown>,
) =>
  DonorRequest.findOneAndUpdate(
    { _id: id, status: "open" },
    { $set: update },
    { returnDocument: "after", runValidators: true },
  )
    .lean<DonorRequestEntity>()
    .exec();

export const countDonorProfiles = () => DonorProfile.countDocuments().exec();
export const countOpenDonorRequests = () => DonorRequest.countDocuments({ status: "open" }).exec();
