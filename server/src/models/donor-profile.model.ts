import mongoose, { Schema, type Model, type Types } from "mongoose";
import {
  BLOOD_GROUPS,
  DONATION_TYPES,
  type BloodGroup,
  type DonationType,
} from "../constants/supporting.js";

export interface DonorProfileEntity {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  donationTypes: DonationType[];
  bloodGroup?: BloodGroup;
  city: string;
  state: string;
  available: boolean;
  consentGranted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<DonorProfileEntity>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    donationTypes: { type: [{ type: String, enum: DONATION_TYPES }], required: true },
    bloodGroup: { type: String, enum: BLOOD_GROUPS },
    city: { type: String, required: true, trim: true, maxlength: 100 },
    state: { type: String, required: true, trim: true, maxlength: 100 },
    available: { type: Boolean, required: true, default: true, index: true },
    consentGranted: { type: Boolean, required: true, default: false },
  },
  { timestamps: true },
);
schema.index({ donationTypes: 1, bloodGroup: 1, state: 1, city: 1, available: 1 });

export const DonorProfile: Model<DonorProfileEntity> =
  (mongoose.models["DonorProfile"] as Model<DonorProfileEntity> | undefined) ??
  mongoose.model<DonorProfileEntity>("DonorProfile", schema);
