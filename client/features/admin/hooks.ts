"use client";

import {
  keepPreviousData,
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import type { VerificationStatus } from "@/types/api";
import { adminApi, type ListAuditLogsParams, type ListDoctorsParams } from "./api";

export const useAdminDoctors = (params: ListDoctorsParams) =>
  useQuery({
    queryKey: queryKeys.adminDoctors(params),
    queryFn: () => adminApi.listDoctors(params),
    placeholderData: keepPreviousData,
  });

export const useAuditLogs = (params: ListAuditLogsParams) =>
  useQuery({
    queryKey: queryKeys.adminAuditLogs({ ...params }),
    queryFn: () => adminApi.listAuditLogs(params),
    placeholderData: keepPreviousData,
  });

const STATUSES: VerificationStatus[] = ["pending", "verified", "rejected"];

/** Doctor counts per verification status (one cheap request each). */
export const useDoctorCounts = () => {
  const results = useQueries({
    queries: STATUSES.map((status) => ({
      queryKey: queryKeys.adminDoctors({ status, page: 1, limit: 1 }),
      queryFn: () => adminApi.listDoctors({ status, page: 1, limit: 1 }),
    })),
  });
  return {
    isPending: results.some((r) => r.isPending),
    isError: results.some((r) => r.isError),
    error: results.find((r) => r.error)?.error ?? null,
    refetch: () => results.forEach((r) => void r.refetch()),
    counts: {
      pending: results[0]?.data?.pagination.total ?? 0,
      verified: results[1]?.data?.pagination.total ?? 0,
      rejected: results[2]?.data?.pagination.total ?? 0,
    },
  };
};

export const useSetDoctorVerification = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      doctorId,
      status,
      notes,
    }: {
      doctorId: string;
      status: VerificationStatus;
      notes?: string;
    }) =>
      adminApi.setDoctorVerification(doctorId, {
        status,
        ...(notes ? { notes } : {}),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.adminDoctorsAll });
      // New audit entry was written server-side.
      void queryClient.invalidateQueries({ queryKey: ["admin", "audit-logs"] });
    },
  });
};
