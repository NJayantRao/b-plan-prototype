import { api, unwrap } from "@/lib/api/client";
import type { PatientProfileResponse } from "@/types/api";

/** Body for PATCH /patients/me. `null` clears an optional field. */
export interface UpdatePatientProfilePayload {
  dateOfBirth?: string | null;
  gender?: string | null;
  location?: {
    city?: string;
    state?: string;
    country?: string;
    pincode?: string;
  } | null;
  allergies?: string[];
  currentMedications?: { name: string; dosage?: string; frequency?: string }[];
  medicalHistory?: {
    condition: string;
    diagnosedYear?: number;
    notes?: string;
  }[];
  consents?: { type: string; granted: boolean }[];
}

export const patientsApi = {
  getMyProfile: (): Promise<PatientProfileResponse> =>
    unwrap(api.get("/patients/me")),

  updateMyProfile: (
    payload: UpdatePatientProfilePayload,
  ): Promise<PatientProfileResponse> => unwrap(api.patch("/patients/me", payload)),
};
