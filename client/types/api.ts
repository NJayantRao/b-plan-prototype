/** Types mirroring the Express API (see server docs/api.md). */

export type Role = "patient" | "doctor" | "admin" | "partner" | "responder";
export type AccountStatus = "active" | "suspended";
export type VerificationStatus = "pending" | "verified" | "rejected";
export type Gender = "female" | "male" | "other" | "prefer_not_to_say";
export type ConsentType = "data_processing" | "ai_assessment" | "donor_contact";
export type AuditOutcome = "success" | "failure" | "denied";

export interface ApiEnvelope<T> {
  statusCode: number;
  success: boolean;
  message: string;
  data: T;
}

export interface ApiErrorBody {
  statusCode: number;
  success: false;
  message: string;
  code?: string;
  errors?: { field?: string; message: string }[];
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface Paginated<T> {
  items: T[];
  pagination: Pagination;
}

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: Role;
  status: AccountStatus;
  emailVerified: boolean;
  createdAt: string;
}

export interface MeResponse {
  user: User;
  doctorVerificationStatus?: VerificationStatus;
}

export interface Consent {
  type: ConsentType;
  granted: boolean;
  version: string;
  updatedAt: string;
}

export interface PatientProfile {
  id: string;
  userId: string;
  dateOfBirth: string | null;
  gender: Gender | null;
  location: {
    city?: string;
    state?: string;
    country?: string;
    pincode?: string;
  } | null;
  allergies: string[];
  currentMedications: { name: string; dosage?: string; frequency?: string }[];
  medicalHistory: {
    condition: string;
    diagnosedYear?: number;
    notes?: string;
  }[];
  consents: Consent[];
  updatedAt: string;
}

export interface PatientProfileResponse {
  user: User;
  profile: PatientProfile;
}

export interface DoctorProfile {
  id: string;
  userId: string;
  specialties: string[];
  qualifications: { degree: string; institution?: string; year?: number }[];
  licenseNumber: string | null;
  registrationCouncil: string | null;
  yearsOfExperience: number | null;
  bio: string | null;
  consultationFee: number | null;
  weeklyAvailability: { dayOfWeek: number; startTime: string; endTime: string }[];
  verificationStatus: VerificationStatus;
  verification: {
    reviewedBy: string;
    reviewedAt: string;
    notes: string | null;
  } | null;
  updatedAt: string;
}

export interface AdminDoctorRow extends DoctorProfile {
  user: {
    firstName: string;
    lastName: string;
    email: string;
    status: AccountStatus;
  } | null;
}

export interface AuditLog {
  id: string;
  actorId: string | null;
  actorRole: string | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  outcome: AuditOutcome;
  ip: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export type ClinicalSeverity = "mild" | "moderate" | "severe";
export type ClinicalDurationUnit = "hours" | "days" | "weeks" | "months";
export type AssessmentStatus =
  | "awaiting_review"
  | "in_review"
  | "reviewed"
  | "second_opinion"
  | "completed";
export type ClinicalPriority = "routine" | "urgent" | "emergency";
export type AiStatus = "pending" | "completed" | "unavailable" | "not_requested";
export type AiMode = "gemini" | "demo";
export type ReviewKind = "primary" | "second_opinion";
export type ReviewUrgency = "routine" | "soon" | "urgent" | "emergency";
export type AiAgreement = "agree" | "partially_agree" | "disagree" | "not_assessed";
export type SecondOpinionOutcome = "confirms_primary" | "differs_from_primary" | "inconclusive";
export type SecondOpinionStatus = "requested" | "assigned" | "completed";
export type CareTaskType = "medication" | "test" | "referral" | "lifestyle" | "follow_up" | "other";
export type CareTaskStatus = "pending" | "in_progress" | "completed" | "skipped";

export interface ClinicalPerson {
  id: string;
  name: string;
}

export interface ClinicalSymptom {
  name: string;
  severity: ClinicalSeverity;
  duration: { value: number; unit: ClinicalDurationUnit };
}

export interface AssessmentSafety {
  level: "none" | "urgent" | "emergency";
  matches: { id: string; label: string; level: "urgent" | "emergency" }[];
  advice: string;
  rulesVersion: string;
  clinicallyReviewed: boolean;
  evaluatedAt: string;
}

export interface AiAssessmentResult {
  summary: string;
  possibleExplanations: {
    name: string;
    likelihood: "more_likely" | "possible" | "less_likely";
    reasoning: string;
  }[];
  uncertainty: string;
  missingInformation: string[];
  suggestedNextSteps: { action: string; timeframe: "now" | "within_24_hours" | "within_few_days" | "routine" }[];
  whenToSeekUrgentCare: string[];
  suggestedSpecialty?: string;
  aiRiskEstimate: "low" | "medium" | "high";
  disclaimer: string;
  limitations: string;
}

export interface AssessmentReview {
  id: string;
  kind: ReviewKind;
  doctor: ClinicalPerson | null;
  findings: {
    impression: string;
    possibleConditions: string[];
    recommendedTests: string[];
    urgency: ReviewUrgency;
    advice: string;
    notes?: string;
  };
  aiComparison: { agreement: AiAgreement; differences?: string };
  outcome: { result: SecondOpinionOutcome; summary: string } | null;
  submittedAt: string;
  revisions: { amendedAt: string; reason: string }[];
}

export interface SecondOpinion {
  id: string;
  assessmentId: string;
  status: SecondOpinionStatus;
  reason: string | null;
  requestedByRole: "patient" | "doctor";
  assignedDoctor: ClinicalPerson | null;
  finalOutcome: { result: SecondOpinionOutcome; summary: string; decidedAt: string } | null;
  createdAt: string;
}

export interface PatientAssessment {
  id: string;
  status: AssessmentStatus;
  priority: ClinicalPriority;
  createdAt: string;
  updatedAt: string;
  symptoms: ClinicalSymptom[];
  description: string | null;
  safety: AssessmentSafety;
  ai: {
    status: AiStatus;
    mode: AiMode | null;
    model: string | null;
    generatedAt: string | null;
    result: AiAssessmentResult | null;
    error: { code: string; message: string } | null;
    note: string | null;
    attempts: number;
    canRetry: boolean;
  };
  assignedDoctor: ClinicalPerson | null;
  reviews: AssessmentReview[];
  secondOpinion: SecondOpinion | null;
  carePlanId: string | null;
}

export interface PatientAssessmentSummary {
  id: string;
  status: AssessmentStatus;
  priority: ClinicalPriority;
  createdAt: string;
  symptoms: { name: string; severity: ClinicalSeverity }[];
  safetyLevel: AssessmentSafety["level"];
  aiStatus: AiStatus;
  aiMode: AiMode | null;
  reviewCount: number;
}

export interface DoctorAssessment {
  id: string;
  role: "primary" | "second_opinion";
  status: AssessmentStatus;
  priority: ClinicalPriority;
  createdAt: string;
  updatedAt: string;
  patient: ClinicalPerson & {
    ageYears: number | null;
    gender: Gender | null;
    allergies: string[];
    currentMedications: string[];
    conditions: string[];
  };
  symptoms: ClinicalSymptom[];
  description: string | null;
  safety: AssessmentSafety;
  ai: PatientAssessment["ai"];
  primaryDoctor: ClinicalPerson | null;
  reviews: AssessmentReview[];
  reviewsHiddenForIndependence: boolean;
  secondOpinion: SecondOpinion | null;
  carePlanId: string | null;
}

export interface AssessmentQueueItem {
  id: string;
  type: "primary" | "second_opinion";
  secondOpinionId: string | null;
  secondOpinionReason: string | null;
  priority: ClinicalPriority;
  createdAt: string;
  patient: { ageYears: number | null; gender: Gender | null };
  symptoms: ClinicalSymptom[];
  description: string | null;
  safety: { level: AssessmentSafety["level"]; matches: AssessmentSafety["matches"] };
  ai: { status: AiStatus; mode: AiMode | null; summary: string | null; riskEstimate: string | null };
}

export interface DoctorAssessmentSummary {
  id: string;
  role: "primary" | "second_opinion";
  status: AssessmentStatus;
  priority: ClinicalPriority;
  createdAt: string;
  updatedAt: string;
  patient: ClinicalPerson | null;
  symptoms: { name: string; severity: ClinicalSeverity }[];
  safetyLevel: AssessmentSafety["level"];
}

export interface CarePlan {
  id: string;
  assessmentId: string;
  title: string;
  summary: string | null;
  doctor: ClinicalPerson | null;
  patient?: ClinicalPerson | null;
  tasks: {
    id: string;
    title: string;
    description: string | null;
    type: CareTaskType;
    dueDate: string | null;
    status: CareTaskStatus;
    completedAt: string | null;
    notes: string | null;
    isOverdue: boolean;
  }[];
  referrals: { specialty: string; reason: string; urgency: "routine" | "soon" | "urgent" }[];
  followUpDate: string | null;
  progressStatus: "active" | "completed" | "cancelled";
  progress: { done: number; total: number; percent: number; overdue: number };
  createdAt: string;
  updatedAt: string;
}

export interface SecondOpinionQueueItem extends AssessmentQueueItem {
  type: "second_opinion";
  secondOpinionId: string;
}
