"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { clinicalApi, type AssessmentInput, type CarePlanInput, type ReviewInput } from "./api";

export const useAssessments = (filters: { scope?: "queue" | "mine"; page?: number; limit?: number } = {}) =>
  useQuery({
    queryKey: queryKeys.assessments(filters),
    queryFn: () => clinicalApi.listAssessments(filters),
    staleTime: 5_000,
  });

export const useAssessment = (id: string) =>
  useQuery({
    queryKey: queryKeys.assessment(id),
    queryFn: () => clinicalApi.getAssessment(id),
    enabled: Boolean(id),
  });

export const useSecondOpinions = (filters: { scope?: "available" | "mine"; page?: number; limit?: number } = {}) =>
  useQuery({
    queryKey: queryKeys.secondOpinions(filters),
    queryFn: () => clinicalApi.listSecondOpinions(filters),
    staleTime: 5_000,
  });

export const useCarePlans = (filters: { assessmentId?: string; page?: number; limit?: number } = {}) =>
  useQuery({
    queryKey: queryKeys.carePlans(filters),
    queryFn: () => clinicalApi.listCarePlans(filters),
  });

const invalidateClinical = (queryClient: ReturnType<typeof useQueryClient>) => {
  void queryClient.invalidateQueries({ queryKey: ["clinical"] });
};

export const useCreateAssessment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AssessmentInput) => clinicalApi.createAssessment(input),
    onSuccess: () => invalidateClinical(queryClient),
  });
};

export const useRetryAssessmentAi = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => clinicalApi.retryAi(id),
    onSuccess: () => invalidateClinical(queryClient),
  });
};

export const useClaimAssessment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => clinicalApi.claimAssessment(id),
    onSuccess: () => invalidateClinical(queryClient),
  });
};

export const useSubmitReview = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ReviewInput }) =>
      clinicalApi.submitReview(id, input),
    onSuccess: () => invalidateClinical(queryClient),
  });
};

export const useRequestSecondOpinion = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      clinicalApi.requestSecondOpinion(id, reason),
    onSuccess: () => invalidateClinical(queryClient),
  });
};

export const useClaimSecondOpinion = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => clinicalApi.claimSecondOpinion(id),
    onSuccess: () => invalidateClinical(queryClient),
  });
};

export const useCreateCarePlan = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CarePlanInput) => clinicalApi.createCarePlan(input),
    onSuccess: () => invalidateClinical(queryClient),
  });
};

export const useUpdateCareTask = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      planId,
      taskId,
      status,
      notes,
    }: {
      planId: string;
      taskId: string;
      status?: "pending" | "in_progress" | "completed" | "skipped";
      notes?: string;
    }) => clinicalApi.updateTask(planId, taskId, { status, notes }),
    onSuccess: () => invalidateClinical(queryClient),
  });
};
