import { api, unwrap } from "@/lib/api/client";
import type {
  AiAgreement,
  AssessmentQueueItem,
  CarePlan,
  CareTaskStatus,
  CareTaskType,
  ClinicalDurationUnit,
  ClinicalSeverity,
  DoctorAssessment,
  DoctorAssessmentSummary,
  Paginated,
  PatientAssessment,
  PatientAssessmentSummary,
  ReviewUrgency,
  SecondOpinionOutcome,
  SecondOpinionQueueItem,
  SecondOpinionStatus,
} from "@/types/api";

export interface AssessmentInput {
  symptoms: {
    name: string;
    severity: ClinicalSeverity;
    duration: { value: number; unit: ClinicalDurationUnit };
  }[];
  description?: string;
}

export interface ReviewInput {
  findings: {
    impression: string;
    possibleConditions: string[];
    recommendedTests: string[];
    urgency: ReviewUrgency;
    advice: string;
    notes?: string;
  };
  aiComparison: { agreement: AiAgreement; differences?: string };
  outcome?: { result: SecondOpinionOutcome; summary: string };
}

export interface CarePlanInput {
  assessmentId: string;
  title: string;
  summary?: string;
  tasks: { title: string; description?: string; type: CareTaskType; dueDate?: string }[];
  referrals?: { specialty: string; reason: string; urgency: "routine" | "soon" | "urgent" }[];
  followUpDate?: string;
}

export const clinicalApi = {
  listAssessments: (params: { scope?: "queue" | "mine"; page?: number; limit?: number } = {}) =>
    unwrap<Paginated<PatientAssessmentSummary | AssessmentQueueItem | DoctorAssessmentSummary>>(
      api.get("/assessments", { params }),
    ),
  getAssessment: async (id: string): Promise<PatientAssessment | DoctorAssessment> =>
    (await unwrap<{ assessment: PatientAssessment | DoctorAssessment }>(api.get(`/assessments/${id}`))).assessment,
  createAssessment: async (input: AssessmentInput): Promise<PatientAssessment> =>
    (await unwrap<{ assessment: PatientAssessment }>(
      api.post("/assessments", input, { timeout: 120_000 }),
    )).assessment,
  retryAi: async (id: string): Promise<PatientAssessment> =>
    (await unwrap<{ assessment: PatientAssessment }>(
      api.post(`/assessments/${id}/retry-ai`, undefined, { timeout: 120_000 }),
    )).assessment,
  claimAssessment: async (id: string): Promise<DoctorAssessment> =>
    (await unwrap<{ assessment: DoctorAssessment }>(api.post(`/assessments/${id}/claim`))).assessment,
  submitReview: async (id: string, input: ReviewInput): Promise<DoctorAssessment> =>
    (await unwrap<{ assessment: DoctorAssessment }>(api.post(`/assessments/${id}/reviews`, input))).assessment,
  requestSecondOpinion: async (assessmentId: string, reason?: string) =>
    (await unwrap<{ secondOpinion: { id: string; assessmentId: string; status: SecondOpinionStatus } }>(
      api.post(`/assessments/${assessmentId}/second-opinions`, reason ? { reason } : {}),
    )).secondOpinion,
  listSecondOpinions: (params: { scope?: "available" | "mine"; page?: number; limit?: number } = {}) =>
    unwrap<Paginated<SecondOpinionQueueItem | {
      id: string;
      assessmentId: string;
      status: SecondOpinionStatus;
      reason: string | null;
      requestedByRole: "patient" | "doctor";
      assignedDoctor: { id: string; name: string } | null;
      finalOutcome: { result: SecondOpinionOutcome; summary: string; decidedAt: string } | null;
      createdAt: string;
      assessment?: { priority: string; symptoms: { name: string; severity: ClinicalSeverity }[] };
    }>>(api.get("/second-opinions", { params })),
  claimSecondOpinion: async (id: string) =>
    unwrap<{ id: string; assessmentId: string; status: SecondOpinionStatus }>(
      api.post(`/second-opinions/${id}/claim`),
    ),
  listCarePlans: (params: { assessmentId?: string; page?: number; limit?: number } = {}) =>
    unwrap<Paginated<CarePlan>>(api.get("/care-plans", { params })),
  createCarePlan: async (input: CarePlanInput): Promise<CarePlan> =>
    (await unwrap<{ carePlan: CarePlan }>(api.post("/care-plans", input))).carePlan,
  updateTask: async (
    planId: string,
    taskId: string,
    input: { status?: CareTaskStatus; notes?: string },
  ): Promise<CarePlan> =>
    (await unwrap<{ carePlan: CarePlan }>(
      api.patch(`/care-plans/${planId}/tasks/${taskId}`, input),
    )).carePlan,
};
