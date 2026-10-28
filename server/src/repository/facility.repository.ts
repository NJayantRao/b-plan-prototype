import type { QueryFilter, Types } from "mongoose";
import {
  PartnerFacility,
  type PartnerFacilityEntity,
} from "../models/partner-facility.model.js";

type Id = string | Types.ObjectId;

export const createFacility = async (
  data: Omit<PartnerFacilityEntity, "_id" | "createdAt" | "updatedAt" | "verificationStatus" | "verification" | "contactPhone" | "contactEmail" | "address"> & {
    address: Omit<PartnerFacilityEntity["address"], "pincode"> & { pincode?: string | undefined };
    contactPhone?: string | undefined;
    contactEmail?: string | undefined;
  },
) => {
  const { address, contactEmail, contactPhone, ...fields } = data;
  const facility = await PartnerFacility.create({
    ...fields,
    address: {
      city: address.city,
      state: address.state,
      country: address.country,
      ...(address.pincode ? { pincode: address.pincode } : {}),
    },
    ...(contactPhone ? { contactPhone } : {}),
    ...(contactEmail ? { contactEmail } : {}),
    verificationStatus: "pending",
  });
  return facility.toObject() as PartnerFacilityEntity;
};

export const findFacilityById = (id: Id) =>
  PartnerFacility.findById(id).lean<PartnerFacilityEntity>().exec();

export const listFacilities = async (filter: {
  page: number;
  limit: number;
  status?: PartnerFacilityEntity["verificationStatus"] | undefined;
  partnerId?: Id | undefined;
  includeUnverified?: boolean;
  city?: string | undefined;
  state?: string | undefined;
  type?: PartnerFacilityEntity["type"] | undefined;
}) => {
  const query: QueryFilter<PartnerFacilityEntity> = {
    ...(filter.status
      ? { verificationStatus: filter.status }
      : filter.includeUnverified || filter.partnerId
        ? {}
        : { verificationStatus: "verified" }),
    ...(filter.partnerId ? { partnerId: filter.partnerId } : {}),
    ...(filter.city ? { "address.city": new RegExp(`^${filter.city.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") } : {}),
    ...(filter.state ? { "address.state": new RegExp(`^${filter.state.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") } : {}),
    ...(filter.type ? { type: filter.type } : {}),
  };
  const [items, total] = await Promise.all([
    PartnerFacility.find(query).sort({ name: 1 }).skip((filter.page - 1) * filter.limit)
      .limit(filter.limit).lean<PartnerFacilityEntity[]>().exec(),
    PartnerFacility.countDocuments(query).exec(),
  ]);
  return { items, total };
};

export const updateFacilityVerification = (
  id: Id,
  verificationStatus: PartnerFacilityEntity["verificationStatus"],
  verification?: PartnerFacilityEntity["verification"],
) =>
  PartnerFacility.findByIdAndUpdate(
    id,
    {
      $set: { verificationStatus, ...(verification ? { verification } : {}) },
      ...(!verification ? { $unset: { verification: "" } } : {}),
    },
    { returnDocument: "after", runValidators: true },
  )
    .lean<PartnerFacilityEntity>()
    .exec();

export const countFacilities = () => PartnerFacility.countDocuments().exec();
export const countPendingFacilities = () =>
  PartnerFacility.countDocuments({ verificationStatus: "pending" }).exec();
