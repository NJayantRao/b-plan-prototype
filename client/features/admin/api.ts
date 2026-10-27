import { api, unwrap } from "@/lib/api/client";
import type {
  AdminDoctorRow,
  AuditLog,
  AuditOutcome,
  DoctorProfile,
  Paginated,
  VerificationStatus,
} from "@/types/api";

export interface ListDoctorsParams {
  status?: VerificationStatus | undefined;
  page?: number;
  limit?: number;
}

export interface ListAuditLogsParams {
  action?: string | undefined;
  outcome?: AuditOutcome | undefined;
  page?: number;
  limit?: number;
}

/** Drops undefined/empty values so they are not sent as query params. */
const clean = <T extends object>(params: T) =>
  Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== ""),
  );

export const adminApi = {
  listDoctors: (params: ListDoctorsParams = {}): Promise<Paginated<AdminDoctorRow>> =>
    unwrap(api.get("/admin/doctors", { params: clean(params) })),

  /** `doctorId` is the doctor's *user* id, as returned in `userId`. */
  setDoctorVerification: async (
    doctorId: string,
    input: { status: VerificationStatus; notes?: string },
  ): Promise<DoctorProfile> =>
    (
      await unwrap<{ profile: DoctorProfile }>(
        api.patch(`/admin/doctors/${doctorId}/verification`, input),
      )
    ).profile,

  listAuditLogs: (params: ListAuditLogsParams = {}): Promise<Paginated<AuditLog>> =>
    unwrap(api.get("/admin/audit-logs", { params: clean(params) })),
};
