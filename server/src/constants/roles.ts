export const ROLES = ["patient", "doctor", "admin", "partner", "responder"] as const;
export type Role = (typeof ROLES)[number];

export const ACCOUNT_STATUSES = ["active", "suspended"] as const;
export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];

export const VERIFICATION_STATUSES = ["pending", "verified", "rejected"] as const;
export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

export const CONSENT_TYPES = [
  "data_processing",
  "ai_assessment",
  "donor_contact",
] as const;
export type ConsentType = (typeof CONSENT_TYPES)[number];

/** Bump when consent wording changes so old consents can be re-requested. */
export const CONSENT_VERSION = "2026-10-v1";
