import type { VerificationStatus } from "@/types/api";

export const queryKeys = {
  me: ["me"] as const,
  patientProfile: ["patient", "profile"] as const,
  doctorProfile: ["doctor", "profile"] as const,
  adminDoctors: (filters?: {
    status?: VerificationStatus | undefined;
    page?: number;
    limit?: number;
  }) => ["admin", "doctors", filters ?? {}] as const,
  adminDoctorsAll: ["admin", "doctors"] as const,
  adminAuditLogs: (filters?: Record<string, unknown>) =>
    ["admin", "audit-logs", filters ?? {}] as const,
};
