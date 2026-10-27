import { z } from "zod";
import { CONSENT_TYPES } from "../constants/roles.js";
import { GENDERS } from "../models/patient-profile.model.js";

const text = (max: number) => z.string().trim().min(1).max(max);

const dateOfBirthSchema = z.iso
  .date("Use the format YYYY-MM-DD")
  .transform((value) => new Date(`${value}T00:00:00.000Z`))
  .refine((date) => date.getUTCFullYear() >= 1900 && date <= new Date(), {
    message: "Date of birth must be in the past",
  });

const locationSchema = z
  .object({
    city: text(100).optional(),
    state: text(100).optional(),
    country: z.string().trim().length(2).toUpperCase().optional(),
    pincode: z.string().trim().regex(/^[A-Za-z0-9 -]{3,10}$/).optional(),
  })
  .strict();

const medicationSchema = z
  .object({
    name: text(100),
    dosage: text(100).optional(),
    frequency: text(100).optional(),
  })
  .strict();

const historySchema = z
  .object({
    condition: text(200),
    diagnosedYear: z.number().int().min(1900).max(new Date().getFullYear()).optional(),
    notes: text(1000).optional(),
  })
  .strict();

const consentSchema = z
  .object({ type: z.enum(CONSENT_TYPES), granted: z.boolean() })
  .strict();

// `.strict()` means client-supplied fields like userId or role are rejected.
// `null` clears an optional field.
export const updatePatientProfileSchema = z
  .object({
    dateOfBirth: dateOfBirthSchema.nullable().optional(),
    gender: z.enum(GENDERS).nullable().optional(),
    location: locationSchema.nullable().optional(),
    allergies: z.array(text(100)).max(50).optional(),
    currentMedications: z.array(medicationSchema).max(50).optional(),
    medicalHistory: z.array(historySchema).max(100).optional(),
    consents: z.array(consentSchema).max(CONSENT_TYPES.length).optional(),
  })
  .strict();

export type UpdatePatientProfileInput = z.infer<typeof updatePatientProfileSchema>;
