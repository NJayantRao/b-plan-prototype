import type { QueryFilter, Types, UpdateQuery } from "mongoose";
import type { VerificationStatus } from "../constants/roles.js";
import {
  DoctorProfile,
  type DoctorProfileEntity,
} from "../models/doctor-profile.model.js";

export const findDoctorProfileByUserId = (userId: string | Types.ObjectId) =>
  DoctorProfile.findOne({ userId }).lean<DoctorProfileEntity>().exec();

export const getOrCreateDoctorProfile = (userId: string | Types.ObjectId) =>
  DoctorProfile.findOneAndUpdate(
    { userId },
    {
      // Set defaults explicitly: upserts do not reliably apply them. A new
      // doctor must always start unverified.
      $setOnInsert: {
        userId,
        specialties: [],
        qualifications: [],
        verificationStatus: "pending",
      },
    },
    { upsert: true, returnDocument: "after", runValidators: true },
  )
    .lean<DoctorProfileEntity>()
    .exec();

export const updateDoctorProfile = (
  userId: string | Types.ObjectId,
  update: UpdateQuery<DoctorProfileEntity>,
) =>
  DoctorProfile.findOneAndUpdate({ userId }, update, {
    returnDocument: "after",
    runValidators: true,
  })
    .lean<DoctorProfileEntity>()
    .exec();

export const listDoctorProfiles = async (
  status: VerificationStatus | undefined,
  page: number,
  limit: number,
) => {
  const filter: QueryFilter<DoctorProfileEntity> = status
    ? { verificationStatus: status }
    : {};
  const [items, total] = await Promise.all([
    DoctorProfile.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean<DoctorProfileEntity[]>()
      .exec(),
    DoctorProfile.countDocuments(filter).exec(),
  ]);
  return { items, total };
};
