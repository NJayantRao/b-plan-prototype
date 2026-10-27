import mongoose, { Schema, type Model, type Types } from "mongoose";
import {
  VERIFICATION_STATUSES,
  type VerificationStatus,
} from "../constants/roles.js";

export interface DoctorProfileEntity {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  specialties: string[];
  qualifications: { degree: string; institution?: string; year?: number }[];
  licenseNumber?: string;
  registrationCouncil?: string;
  yearsOfExperience?: number;
  bio?: string;
  consultationFee?: number;
  verificationStatus: VerificationStatus;
  verification?: {
    reviewedBy: Types.ObjectId;
    reviewedAt: Date;
    notes?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const doctorProfileSchema = new Schema<DoctorProfileEntity>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    specialties: { type: [{ type: String, trim: true, maxlength: 100 }], default: [] },
    qualifications: {
      type: [
        new Schema(
          {
            degree: { type: String, required: true, trim: true, maxlength: 100 },
            institution: { type: String, trim: true, maxlength: 200 },
            year: { type: Number, min: 1900, max: 2100 },
          },
          { _id: false },
        ),
      ],
      default: [],
    },
    licenseNumber: { type: String, trim: true, maxlength: 50 },
    registrationCouncil: { type: String, trim: true, maxlength: 100 },
    yearsOfExperience: { type: Number, min: 0, max: 70 },
    bio: { type: String, trim: true, maxlength: 1000 },
    consultationFee: { type: Number, min: 0 },
    verificationStatus: {
      type: String,
      enum: VERIFICATION_STATUSES,
      required: true,
      default: "pending",
      index: true,
    },
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

export const DoctorProfile: Model<DoctorProfileEntity> =
  (mongoose.models["DoctorProfile"] as Model<DoctorProfileEntity> | undefined) ??
  mongoose.model<DoctorProfileEntity>("DoctorProfile", doctorProfileSchema);
