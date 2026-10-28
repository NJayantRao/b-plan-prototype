export const APPOINTMENT_STATUSES = [
  "requested",
  "confirmed",
  "cancelled",
  "completed",
] as const;
export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

export const DONATION_TYPES = ["whole_blood", "plasma", "platelets"] as const;
export type DonationType = (typeof DONATION_TYPES)[number];
export const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const;
export type BloodGroup = (typeof BLOOD_GROUPS)[number];
export const DONOR_REQUEST_STATUSES = ["open", "matched", "cancelled", "fulfilled"] as const;
export type DonorRequestStatus = (typeof DONOR_REQUEST_STATUSES)[number];

export const EMERGENCY_URGENCIES = ["urgent", "critical"] as const;
export type EmergencyUrgency = (typeof EMERGENCY_URGENCIES)[number];
export const EMERGENCY_STATUSES = [
  "queued",
  "assigned",
  "en_route",
  "arrived",
  "completed",
  "cancelled",
] as const;
export type EmergencyStatus = (typeof EMERGENCY_STATUSES)[number];

export const FACILITY_TYPES = [
  "hospital",
  "clinic",
  "diagnostic_center",
  "blood_bank",
  "other",
] as const;
export type FacilityType = (typeof FACILITY_TYPES)[number];
export const FACILITY_STATUSES = ["pending", "verified", "rejected"] as const;
export type FacilityStatus = (typeof FACILITY_STATUSES)[number];

export const NOTIFICATION_TYPES = [
  "appointment",
  "donor_request",
  "emergency",
  "facility",
  "system",
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];
