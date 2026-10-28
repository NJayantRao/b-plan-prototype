import mongoose, { Schema, type Model, type Types } from "mongoose";
import {
  BLOOD_GROUPS,
  DONATION_TYPES,
  DONOR_REQUEST_STATUSES,
  type BloodGroup,
  type DonationType,
  type DonorRequestStatus,
} from "../constants/supporting.js";

export interface DonorRequestEntity {
  _id: Types.ObjectId;
  requesterId: Types.ObjectId;
  donationType: DonationType;
  bloodGroup?: BloodGroup;
  city: string;
  state: string;
  status: DonorRequestStatus;
  matchedDonorIds: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<DonorRequestEntity>(
  {
    requesterId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    donationType: { type: String, enum: DONATION_TYPES, required: true },
    bloodGroup: { type: String, enum: BLOOD_GROUPS },
    city: { type: String, required: true, trim: true, maxlength: 100 },
    state: { type: String, required: true, trim: true, maxlength: 100 },
    status: { type: String, enum: DONOR_REQUEST_STATUSES, required: true, default: "open" },
    matchedDonorIds: { type: [{ type: Schema.Types.ObjectId, ref: "DonorProfile" }], default: [] },
  },
  { timestamps: true },
);

export const DonorRequest: Model<DonorRequestEntity> =
  (mongoose.models["DonorRequest"] as Model<DonorRequestEntity> | undefined) ??
  mongoose.model<DonorRequestEntity>("DonorRequest", schema);
