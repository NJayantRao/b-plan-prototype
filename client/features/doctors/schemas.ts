import { z } from "zod";
import type { DoctorProfile } from "@/types/api";
import type { UpdateDoctorProfilePayload } from "./api";

const thisYear = new Date().getFullYear();
const text = (max: number) => z.string().trim().max(max, `Max ${max} characters`);

export const doctorFormSchema = z.object({
  specialties: z.array(z.string().min(1).max(100)).max(10, "Up to 10 specialties"),
  qualifications: z
    .array(
      z.object({
        degree: z.string().trim().min(1, "Degree is required").max(100),
        institution: text(200),
        year: z
          .string()
          .trim()
          .refine((v) => v === "" || (/^\d{4}$/.test(v) && +v >= 1900 && +v <= thisYear), `Year between 1900 and ${thisYear}`),
      }),
    )
    .max(20),
  licenseNumber: text(50),
  registrationCouncil: text(100),
  yearsOfExperience: z
    .string()
    .trim()
    .refine((v) => v === "" || (/^\d{1,2}$/.test(v) && +v <= 70), "A whole number from 0 to 70"),
  consultationFee: z
    .string()
    .trim()
    .refine((v) => v === "" || (/^\d+(\.\d{1,2})?$/.test(v) && +v <= 100_000), "An amount up to 100,000"),
  bio: text(1000),
});

export type DoctorFormValues = z.infer<typeof doctorFormSchema>;

export const doctorToForm = (profile: DoctorProfile): DoctorFormValues => ({
  specialties: profile.specialties,
  qualifications: profile.qualifications.map((q) => ({
    degree: q.degree,
    institution: q.institution ?? "",
    year: q.year ? String(q.year) : "",
  })),
  licenseNumber: profile.licenseNumber ?? "",
  registrationCouncil: profile.registrationCouncil ?? "",
  yearsOfExperience: profile.yearsOfExperience === null ? "" : String(profile.yearsOfExperience),
  consultationFee: profile.consultationFee === null ? "" : String(profile.consultationFee),
  bio: profile.bio ?? "",
});

/** Scalar fields the API can set but cannot clear. */
export const NON_CLEARABLE = [
  "licenseNumber",
  "registrationCouncil",
  "yearsOfExperience",
  "consultationFee",
  "bio",
] as const satisfies readonly (keyof DoctorFormValues)[];

export const findClearedFields = (values: DoctorFormValues, initial: DoctorFormValues) =>
  NON_CLEARABLE.filter((field) => initial[field] !== "" && values[field] === "");

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

export const doctorFormToPayload = (
  values: DoctorFormValues,
  initial: DoctorFormValues,
): UpdateDoctorProfilePayload => {
  const payload: UpdateDoctorProfilePayload = {};

  if (!same(values.specialties, initial.specialties)) payload.specialties = values.specialties;
  if (!same(values.qualifications, initial.qualifications)) {
    payload.qualifications = values.qualifications.map((q) => ({
      degree: q.degree,
      ...(q.institution ? { institution: q.institution } : {}),
      ...(q.year ? { year: Number(q.year) } : {}),
    }));
  }
  if (values.licenseNumber !== initial.licenseNumber && values.licenseNumber) {
    payload.licenseNumber = values.licenseNumber;
  }
  if (values.registrationCouncil !== initial.registrationCouncil && values.registrationCouncil) {
    payload.registrationCouncil = values.registrationCouncil;
  }
  if (values.yearsOfExperience !== initial.yearsOfExperience && values.yearsOfExperience) {
    payload.yearsOfExperience = Number(values.yearsOfExperience);
  }
  if (values.consultationFee !== initial.consultationFee && values.consultationFee) {
    payload.consultationFee = Number(values.consultationFee);
  }
  if (values.bio !== initial.bio && values.bio) payload.bio = values.bio;

  return payload;
};
