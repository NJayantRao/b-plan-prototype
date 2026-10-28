import mongoose, { Schema, type Model, type Types } from "mongoose";
import {
  FACILITY_STATUSES,
  FACILITY_TYPES,
  type FacilityStatus,
  type FacilityType,
} from "../constants/supporting.js";

export interface PartnerFacilityEntity {
  _id: Types.ObjectId;
  partnerId: Types.ObjectId;
  name: string;
  type: FacilityType;
  address: { city: string; state: string; country: string; pincode?: string };
  supportedServices: string[];
  contactPhone?: string;
  contactEmail?: string;
  verificationStatus: FacilityStatus;
  verification?: { reviewedBy: Types.ObjectId; reviewedAt: Date; notes?: string };
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<PartnerFacilityEntity>(
  {
    partnerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 150 },
    type: { type: String, enum: FACILITY_TYPES, required: true },
    address: {
      type: new Schema(
        {
          city: { type: String, required: true, trim: true, maxlength: 100 },
          state: { type: String, required: true, trim: true, maxlength: 100 },
          country: { type: String, required: true, trim: true, maxlength: 2 },
          pincode: { type: String, trim: true, maxlength: 10 },
        },
        { _id: false },
      ),
      required: true,
    },
    supportedServices: { type: [{ type: String, trim: true, maxlength: 100 }], default: [] },
    contactPhone: { type: String, trim: true, maxlength: 30 },
    contactEmail: { type: String, trim: true, lowercase: true, maxlength: 254 },
    verificationStatus: { type: String, enum: FACILITY_STATUSES, required: true, default: "pending", index: true },
    verification: {
      type: new Schema(
        {
          reviewedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
          reviewedAt: { type: Date, required: true },
          notes: { type: String, trim: true, maxlength: 500 },
        },
        { _id: false },
      ),
    },
  },
  { timestamps: true },
);
schema.index({ verificationStatus: 1, "address.state": 1, "address.city": 1 });

export const PartnerFacility: Model<PartnerFacilityEntity> =
  (mongoose.models["PartnerFacility"] as Model<PartnerFacilityEntity> | undefined) ??
  mongoose.model<PartnerFacilityEntity>("PartnerFacility", schema);
