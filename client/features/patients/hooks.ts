"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { patientsApi, type UpdatePatientProfilePayload } from "./api";

export const usePatientProfile = () =>
  useQuery({
    queryKey: queryKeys.patientProfile,
    queryFn: patientsApi.getMyProfile,
  });

export const useUpdatePatientProfile = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdatePatientProfilePayload) =>
      patientsApi.updateMyProfile(payload),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.patientProfile, data);
    },
  });
};
