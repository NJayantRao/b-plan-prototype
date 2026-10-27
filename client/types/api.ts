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
