import type { Types, UpdateQuery } from "mongoose";
import {
  PatientProfile,
  type PatientProfileEntity,
} from "../models/patient-profile.model.js";

export const findPatientProfileByUserId = (userId: string | Types.ObjectId) =>
  PatientProfile.findOne({ userId }).lean<PatientProfileEntity>().exec();

/** Returns the profile, creating an empty one on first access. */
export const getOrCreatePatientProfile = (userId: string | Types.ObjectId) =>
  PatientProfile.findOneAndUpdate(
    { userId },
    {
      // Set array defaults explicitly: upserts do not reliably apply them.
      $setOnInsert: {
        userId,
        allergies: [],
        currentMedications: [],
        medicalHistory: [],
        consents: [],
      },
    },
    { upsert: true, returnDocument: "after", runValidators: true },
  )
    .lean<PatientProfileEntity>()
    .exec();

export const updatePatientProfile = (
  userId: string | Types.ObjectId,
  update: UpdateQuery<PatientProfileEntity>,
) =>
  PatientProfile.findOneAndUpdate({ userId }, update, {
    returnDocument: "after",
    runValidators: true,
  })
    .lean<PatientProfileEntity>()
    .exec();
