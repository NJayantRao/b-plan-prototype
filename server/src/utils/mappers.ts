import type { AuditLogEntity } from "../models/audit-log.model.js";
import type { DoctorProfileEntity } from "../models/doctor-profile.model.js";
import type { PatientProfileEntity } from "../models/patient-profile.model.js";
import type { UserEntity } from "../models/user.model.js";

/** Public user shape: never includes the password hash. */
export const toPublicUser = (user: UserEntity) => ({
  id: String(user._id),
  firstName: user.firstName,
  lastName: user.lastName,
  email: user.email,
  role: user.role,
  status: user.status,
  emailVerified: user.emailVerified,
  createdAt: user.createdAt,
});

export const toPublicPatientProfile = (profile: PatientProfileEntity) => ({
  id: String(profile._id),
  userId: String(profile.userId),
  dateOfBirth: profile.dateOfBirth ?? null,
  gender: profile.gender ?? null,
  location: profile.location ?? null,
  allergies: profile.allergies ?? [],
  currentMedications: profile.currentMedications ?? [],
  medicalHistory: profile.medicalHistory ?? [],
  consents: profile.consents ?? [],
  updatedAt: profile.updatedAt,
});

export const toPublicDoctorProfile = (profile: DoctorProfileEntity) => ({
  id: String(profile._id),
  userId: String(profile.userId),
  specialties: profile.specialties ?? [],
  qualifications: profile.qualifications ?? [],
  licenseNumber: profile.licenseNumber ?? null,
  registrationCouncil: profile.registrationCouncil ?? null,
  yearsOfExperience: profile.yearsOfExperience ?? null,
  bio: profile.bio ?? null,
  consultationFee: profile.consultationFee ?? null,
  verificationStatus: profile.verificationStatus,
  verification: profile.verification
    ? {
        reviewedBy: String(profile.verification.reviewedBy),
        reviewedAt: profile.verification.reviewedAt,
        notes: profile.verification.notes ?? null,
      }
    : null,
  updatedAt: profile.updatedAt,
});

export const toPublicAuditLog = (log: AuditLogEntity) => ({
  id: String(log._id),
  actorId: log.actorId ? String(log.actorId) : null,
  actorRole: log.actorRole ?? null,
  action: log.action,
  resourceType: log.resourceType,
  resourceId: log.resourceId ?? null,
  outcome: log.outcome,
  ip: log.ip ?? null,
  metadata: log.metadata ?? null,
  createdAt: log.createdAt,
});
