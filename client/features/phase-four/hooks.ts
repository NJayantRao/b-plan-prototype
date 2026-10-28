"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { phaseFourApi } from "./api";

const invalidate = (queryClient: ReturnType<typeof useQueryClient>, ...keys: string[][]) => {
  for (const queryKey of keys) void queryClient.invalidateQueries({ queryKey });
};

export const useDoctorDirectory = (specialty = "") =>
  useQuery({
    queryKey: ["phase-four", "doctors", specialty],
    queryFn: () => phaseFourApi.listDoctors({ specialty: specialty || undefined, page: 1, limit: 50 }),
  });

export const useDoctorAvailability = (doctorId: string, from: string) =>
  useQuery({
    queryKey: ["phase-four", "doctor-availability", doctorId, from],
    queryFn: () => phaseFourApi.getDoctorAvailability(doctorId, { from, days: 14 }),
    enabled: Boolean(doctorId && from),
  });

export const useAppointments = (status?: "requested" | "confirmed" | "cancelled" | "completed", role: "patient" | "doctor" = "patient") =>
  useQuery({
    queryKey: ["phase-four", "appointments", role, status ?? "all"],
    queryFn: () => phaseFourApi.listAppointments({ status, page: 1, limit: 50 }),
    placeholderData: keepPreviousData,
  });

export const useDonorProfile = () =>
  useQuery({ queryKey: ["phase-four", "donor-profile"], queryFn: phaseFourApi.getDonorProfile });

export const useDonorRequests = () =>
  useQuery({
    queryKey: ["phase-four", "donor-requests"],
    queryFn: () => phaseFourApi.listDonorRequests({ page: 1, limit: 50 }),
  });

export const useEmergencies = (role: "patient" | "responder", status?: import("./api").EmergencyStatus) =>
  useQuery({
    queryKey: ["phase-four", "emergencies", role, status ?? "all"],
    queryFn: () => phaseFourApi.listEmergencies({ status, page: 1, limit: 50 }),
    refetchInterval: role === "responder" ? 15_000 : false,
  });

export const useFacilities = (role: "patient" | "doctor" | "partner" | "admin") =>
  useQuery({
    queryKey: ["phase-four", "facilities", role],
    queryFn: () => phaseFourApi.listFacilities({ page: 1, limit: 50 }),
  });

export const useAdminOverview = () =>
  useQuery({ queryKey: ["phase-four", "admin-overview"], queryFn: phaseFourApi.getAdminOverview });

export const useAdminResponders = () =>
  useQuery({
    queryKey: ["phase-four", "admin-responders"],
    queryFn: () => phaseFourApi.listAdminResponders({ page: 1, limit: 50 }),
  });

export const useNotifications = () =>
  useQuery({
    queryKey: ["phase-four", "notifications"],
    queryFn: () => phaseFourApi.listNotifications({ page: 1, limit: 10 }),
    refetchInterval: 30_000,
  });

export const useCreateAppointment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: phaseFourApi.createAppointment,
    onSuccess: () => invalidate(queryClient, ["phase-four", "appointments"], ["phase-four", "doctor-availability"]),
  });
};

export const useUpdateAppointment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, reason }: { id: string; status: "cancelled" | "confirmed" | "completed"; reason?: string }) =>
      phaseFourApi.updateAppointment(id, { status, reason }),
    onSuccess: () => invalidate(queryClient, ["phase-four", "appointments"], ["phase-four", "doctor-availability"]),
  });
};

export const useSaveDonorProfile = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: phaseFourApi.saveDonorProfile,
    onSuccess: () => invalidate(queryClient, ["phase-four", "donor-profile"]),
  });
};

export const useCreateDonorRequest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: phaseFourApi.createDonorRequest,
    onSuccess: () => invalidate(queryClient, ["phase-four", "donor-requests"]),
  });
};

export const useUpdateDonorRequest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: "cancelled" | "fulfilled" }) =>
      phaseFourApi.updateDonorRequest(id, status),
    onSuccess: () => invalidate(queryClient, ["phase-four", "donor-requests"]),
  });
};

export const useCreateEmergency = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: phaseFourApi.createEmergency,
    onSuccess: () => invalidate(queryClient, ["phase-four", "emergencies"]),
  });
};

export const useClaimEmergency = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: phaseFourApi.claimEmergency,
    onSuccess: () => invalidate(queryClient, ["phase-four", "emergencies"]),
  });
};

export const useUpdateEmergency = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: "en_route" | "arrived" | "completed" }) =>
      phaseFourApi.updateEmergency(id, status),
    onSuccess: () => invalidate(queryClient, ["phase-four", "emergencies"]),
  });
};

export const useCancelEmergency = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: phaseFourApi.cancelEmergency,
    onSuccess: () => invalidate(queryClient, ["phase-four", "emergencies"]),
  });
};

export const useCreateFacility = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: phaseFourApi.createFacility,
    onSuccess: () => invalidate(queryClient, ["phase-four", "facilities"]),
  });
};

export const useVerifyFacility = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, notes }: { id: string; status: "verified" | "rejected" | "pending"; notes?: string }) =>
      phaseFourApi.verifyFacility(id, { status, ...(notes ? { notes } : {}) }),
    onSuccess: () => invalidate(queryClient, ["phase-four", "facilities"], ["phase-four", "admin-overview"]),
  });
};

export const useSetResponderAuthorization = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, authorized }: { id: string; authorized: boolean }) =>
      phaseFourApi.setResponderAuthorization(id, authorized),
    onSuccess: () => invalidate(queryClient, ["phase-four", "admin-responders"], ["phase-four", "admin-overview"]),
  });
};

export const useMarkNotificationRead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: phaseFourApi.markNotificationRead,
    onSuccess: () => invalidate(queryClient, ["phase-four", "notifications"]),
  });
};
