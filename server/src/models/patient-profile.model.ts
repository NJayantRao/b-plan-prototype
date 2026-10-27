import mongoose, { Schema, type Model, type Types } from "mongoose";
import { CONSENT_TYPES, type ConsentType } from "../constants/roles.js";

export const GENDERS = ["female", "male", "other", "prefer_not_to_say"] as const;
export type Gender = (typeof GENDERS)[number];

export interface PatientProfileEntity {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  dateOfBirth?: Date;
  gender?: Gender;
  location?: { city?: string; state?: string; country?: string; pincode?: string };
  allergies: string[];
  currentMedications: { name: string; dosage?: string; frequency?: string }[];
  medicalHistory: { condition: string; diagnosedYear?: number; notes?: string }[];
  consents: {
    type: ConsentType;
    granted: boolean;
    version: string;
    updatedAt: Date;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

const patientProfileSchema = new Schema<PatientProfileEntity>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    dateOfBirth: { type: Date },
    gender: { type: String, enum: GENDERS },
    location: {
      type: new Schema(
        {
          city: { type: String, trim: true, maxlength: 100 },
          state: { type: String, trim: true, maxlength: 100 },
          country: { type: String, trim: true, maxlength: 2 },
          pincode: { type: String, trim: true, maxlength: 10 },
        },
        { _id: false },
      ),
    },
    allergies: { type: [{ type: String, trim: true, maxlength: 100 }], default: [] },
    currentMedications: {
      type: [
        new Schema(
          {
            name: { type: String, required: true, trim: true, maxlength: 100 },
            dosage: { type: String, trim: true, maxlength: 100 },
            frequency: { type: String, trim: true, maxlength: 100 },
          },
          { _id: false },
        ),
      ],
      default: [],
    },
    medicalHistory: {
      type: [
        new Schema(
          {
            condition: { type: String, required: true, trim: true, maxlength: 200 },
            diagnosedYear: { type: Number, min: 1900, max: 2100 },
            notes: { type: String, trim: true, maxlength: 1000 },
          },
          { _id: false },
        ),
      ],
      default: [],
    },
    consents: {
      type: [
        new Schema(
          {
            type: { type: String, enum: CONSENT_TYPES, required: true },
            granted: { type: Boolean, required: true },
            version: { type: String, required: true },
            updatedAt: { type: Date, required: true },
          },
          { _id: false },
        ),
      ],
      default: [],
    },
  },
  { timestamps: true },
);

export const PatientProfile: Model<PatientProfileEntity> =
  (mongoose.models["PatientProfile"] as Model<PatientProfileEntity> | undefined) ??
  mongoose.model<PatientProfileEntity>("PatientProfile", patientProfileSchema);
