import { z } from "zod";
import type { ConsentType, Gender, PatientProfile } from "@/types/api";
import type { UpdatePatientProfilePayload } from "./api";

export const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
  { value: "other", label: "Other" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
];

export const CONSENT_OPTIONS: {
  type: ConsentType;
  title: string;
  description: string;
}[] = [
  {
    type: "data_processing",
    title: "Process my health data",
    description: "Allow this platform to store and use your profile to coordinate your care.",
  },
  {
    type: "ai_assessment",
    title: "AI-assisted assessments",
    description: "Allow AI to analyse symptoms you submit. Output is never a diagnosis and is always reviewed by a doctor.",
  },
  {
    type: "donor_contact",
    title: "Donor contact",
    description: "Allow matched donors or requesters to be contacted through the platform.",
  },
];

const thisYear = new Date().getFullYear();
const text = (max: number) => z.string().trim().max(max, `Max ${max} characters`);

export const profileFormSchema = z.object({
  dateOfBirth: z.string().refine(
    (v) => {
      if (v === "") return true;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
      const d = new Date(`${v}T00:00:00Z`);
      return !Number.isNaN(d.getTime()) && d.getUTCFullYear() >= 1900 && d <= new Date();
    },
    "Enter a valid date in the past",
  ),
  gender: z.string(),
  city: text(100),
  state: text(100),
  country: z.string().trim().refine((v) => v === "" || /^[A-Za-z]{2}$/.test(v), "Use a 2-letter country code"),
  pincode: z.string().trim().refine((v) => v === "" || /^[A-Za-z0-9 -]{3,10}$/.test(v), "3–10 letters, numbers, spaces or dashes"),
  allergies: z.array(z.string().min(1).max(100)).max(50, "Up to 50 allergies"),
  currentMedications: z
    .array(
      z.object({
        name: z.string().trim().min(1, "Medication name is required").max(100),
        dosage: text(100),
        frequency: text(100),
      }),
    )
    .max(50),
  medicalHistory: z
    .array(
      z.object({
        condition: z.string().trim().min(1, "Condition is required").max(200),
        diagnosedYear: z
          .string()
          .trim()
          .refine((v) => v === "" || (/^\d{4}$/.test(v) && +v >= 1900 && +v <= thisYear), `Year between 1900 and ${thisYear}`),
        notes: text(1000),
      }),
    )
    .max(100),
  consents: z.object({
    data_processing: z.boolean(),
    ai_assessment: z.boolean(),
    donor_contact: z.boolean(),
  }),
});

export type ProfileFormValues = z.infer<typeof profileFormSchema>;

export const profileToForm = (profile: PatientProfile): ProfileFormValues => {
  const granted = (type: ConsentType) =>
    profile.consents.find((c) => c.type === type)?.granted ?? false;
  return {
    dateOfBirth: profile.dateOfBirth ? profile.dateOfBirth.slice(0, 10) : "",
    gender: profile.gender ?? "",
    city: profile.location?.city ?? "",
    state: profile.location?.state ?? "",
    country: profile.location?.country ?? "IN",
    pincode: profile.location?.pincode ?? "",
    allergies: profile.allergies,
    currentMedications: profile.currentMedications.map((m) => ({
      name: m.name,
      dosage: m.dosage ?? "",
      frequency: m.frequency ?? "",
    })),
    medicalHistory: profile.medicalHistory.map((h) => ({
      condition: h.condition,
      diagnosedYear: h.diagnosedYear ? String(h.diagnosedYear) : "",
      notes: h.notes ?? "",
    })),
    consents: {
      data_processing: granted("data_processing"),
      ai_assessment: granted("ai_assessment"),
      donor_contact: granted("donor_contact"),
    },
  };
};

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/**
 * Builds the PATCH body containing only what changed. Blank optional strings
 * are omitted because the API rejects empty strings (and `null` clears a
 * field). Sending only changes also keeps the audit trail accurate.
 */
export const formToPayload = (
  values: ProfileFormValues,
  initial: ProfileFormValues,
): UpdatePatientProfilePayload => {
  const payload: UpdatePatientProfilePayload = {};

  if (values.dateOfBirth !== initial.dateOfBirth) {
    payload.dateOfBirth = values.dateOfBirth === "" ? null : values.dateOfBirth;
  }
  if (values.gender !== initial.gender) {
    payload.gender = values.gender === "" ? null : values.gender;
  }

  const locationChanged =
    values.city !== initial.city ||
    values.state !== initial.state ||
    values.country !== initial.country ||
    values.pincode !== initial.pincode;
  if (locationChanged) {
    const location = {
      ...(values.city ? { city: values.city } : {}),
      ...(values.state ? { state: values.state } : {}),
      ...(values.country ? { country: values.country } : {}),
      ...(values.pincode ? { pincode: values.pincode } : {}),
    };
    // A lone default country is not meaningful location data.
    const meaningful = values.city || values.state || values.pincode;
    payload.location = meaningful ? location : null;
  }

  if (!same(values.allergies, initial.allergies)) payload.allergies = values.allergies;

  if (!same(values.currentMedications, initial.currentMedications)) {
    payload.currentMedications = values.currentMedications.map((m) => ({
      name: m.name,
      ...(m.dosage ? { dosage: m.dosage } : {}),
      ...(m.frequency ? { frequency: m.frequency } : {}),
    }));
  }

  if (!same(values.medicalHistory, initial.medicalHistory)) {
    payload.medicalHistory = values.medicalHistory.map((h) => ({
      condition: h.condition,
      ...(h.diagnosedYear ? { diagnosedYear: Number(h.diagnosedYear) } : {}),
      ...(h.notes ? { notes: h.notes } : {}),
    }));
  }

  const changedConsents = CONSENT_OPTIONS.filter(
    ({ type }) => values.consents[type] !== initial.consents[type],
  ).map(({ type }) => ({ type, granted: values.consents[type] }));
  if (changedConsents.length > 0) payload.consents = changedConsents;

  return payload;
};

/** Profile completeness shown on the overview page. */
export const profileChecklist = (profile: PatientProfile) => {
  const items = [
    { id: "dob", label: "Date of birth", done: Boolean(profile.dateOfBirth) },
    { id: "gender", label: "Gender", done: Boolean(profile.gender) },
    { id: "location", label: "Location", done: Boolean(profile.location?.city) },
    {
      id: "consent",
      label: "Consent to health data processing",
      done: profile.consents.some((c) => c.type === "data_processing" && c.granted),
    },
  ];
  const done = items.filter((i) => i.done).length;
  return { items, done, total: items.length, percent: Math.round((done / items.length) * 100) };
};
