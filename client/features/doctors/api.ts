import { api, unwrap } from "@/lib/api/client";
import type { DoctorProfile } from "@/types/api";

export interface UpdateDoctorProfilePayload {
  specialties?: string[];
  qualifications?: { degree: string; institution?: string; year?: number }[];
  licenseNumber?: string;
  registrationCouncil?: string;
  yearsOfExperience?: number;
  bio?: string;
  consultationFee?: number;
  weeklyAvailability?: { dayOfWeek: number; startTime: string; endTime: string }[];
}

export const doctorsApi = {
  getMyProfile: async (): Promise<DoctorProfile> =>
    (await unwrap<{ profile: DoctorProfile }>(api.get("/doctors/me"))).profile,

  updateMyProfile: async (
    payload: UpdateDoctorProfilePayload,
  ): Promise<DoctorProfile> =>
    (await unwrap<{ profile: DoctorProfile }>(api.patch("/doctors/me", payload)))
      .profile,
};
