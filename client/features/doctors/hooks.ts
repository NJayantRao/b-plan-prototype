"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { doctorsApi, type UpdateDoctorProfilePayload } from "./api";

export const useDoctorProfile = () =>
  useQuery({
    queryKey: queryKeys.doctorProfile,
    queryFn: doctorsApi.getMyProfile,
    // The verification status is changed by an admin: keep it fresh.
    staleTime: 5_000,
  });

export const useUpdateDoctorProfile = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateDoctorProfilePayload) =>
      doctorsApi.updateMyProfile(payload),
    onSuccess: (profile) => {
      queryClient.setQueryData(queryKeys.doctorProfile, profile);
      // /auth/me carries doctorVerificationStatus.
      void queryClient.invalidateQueries({ queryKey: queryKeys.me });
    },
  });
};
