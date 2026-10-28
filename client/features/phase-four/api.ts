import { api, unwrap } from "@/lib/api/client";
import type { Paginated } from "@/types/api";

export type AppointmentStatus = "requested" | "confirmed" | "cancelled" | "completed";
export type EmergencyStatus = "queued" | "assigned" | "en_route" | "arrived" | "completed" | "cancelled";
export type FacilityStatus = "pending" | "verified" | "rejected";
export type FacilityType = "hospital" | "clinic" | "diagnostic_center" | "blood_bank" | "other";
export type DonationType = "whole_blood" | "plasma" | "platelets";
export type BloodGroup = "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-";

export interface DoctorDirectoryItem {
  id: string;
  name: string;
  specialties: string[];
  qualifications: { degree: string; institution?: string; year?: number }[];
  yearsOfExperience: number | null;
  bio: string | null;
  consultationFee: number | null;
}

export interface Appointment {
  id: string;
  patient: { id: string; name: string };
  doctor: { id: string; name: string };
  scheduledAt: string;
  durationMinutes: 30;
  reason: string | null;
  status: AppointmentStatus;
  cancellation: { cancelledAt: string; reason: string | null } | null;
  createdAt: string;
  updatedAt: string;
}

export interface DonorProfile {
  id: string;
  donationTypes: DonationType[];
  bloodGroup: BloodGroup | null;
  city: string;
  state: string;
  available: boolean;
  consentGranted: boolean;
  updatedAt: string;
}

export interface DonorRequest {
  id: string;
  donationType: DonationType;
  bloodGroup: BloodGroup | null;
  city: string;
  state: string;
  status: "open" | "matched" | "cancelled" | "fulfilled";
  matchedDonorCount: number;
  simulationNotice: string;
  createdAt: string;
  updatedAt: string;
}

export interface EmergencyCase {
  id: string;
  location: { city: string; state: string; address?: string };
  urgency: "urgent" | "critical";
  description: string;
  assignedResponder: string | null;
  status: EmergencyStatus;
  estimatedArrivalMinutes: number;
  simulated: true;
  simulationNotice: string;
  statusEvents: { status: EmergencyStatus; at: string; actor: "requester" | "responder" }[];
  createdAt: string;
  updatedAt: string;
}

export interface Facility {
  id: string;
  name: string;
  type: FacilityType;
  address: { city: string; state: string; country: string; pincode?: string };
  supportedServices: string[];
  contactPhone: string | null;
  contactEmail: string | null;
  verificationStatus: FacilityStatus;
  verification: { reviewedAt: string; notes: string | null } | null;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationItem {
  id: string;
  type: "appointment" | "donor_request" | "emergency" | "facility" | "system";
  title: string;
  message: string;
  readAt: string | null;
  simulatedDelivery: true;
  createdAt: string;
}

export interface AdminOverview {
  prototype: true;
  users: { total: number; patients: number; doctors: number };
  doctors: { total: number; verified: number; pendingVerification: number };
  assessments: { total: number; awaitingReview: number };
  carePlans: { active: number };
  appointments: { total: number; upcoming: number };
  donors: { registeredDonors: number; openDonorRequests: number };
  emergencies: { total: number; active: number };
  facilities: { total: number; pending: number };
  authorizedResponders: number;
  notice: string;
}

export interface AdminResponder {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  status: "active" | "suspended";
  authorized: boolean;
  authorizedAt: string | null;
}

const clean = <T extends object>(params: T) =>
  Object.fromEntries(Object.entries(params).filter(([, value]) => value !== undefined && value !== ""));

export const phaseFourApi = {
  listDoctors: (params: { specialty?: string; page?: number; limit?: number } = {}) =>
    unwrap<Paginated<DoctorDirectoryItem>>(api.get("/doctors", { params: clean(params) })),
  getDoctorAvailability: (doctorId: string, params: { from: string; days: number }) =>
    unwrap<{ availability: { doctorId: string; timezone: "UTC"; durationMinutes: 30; slots: string[] } }>(
      api.get(`/doctors/${doctorId}/availability`, { params }),
    ),
  listAppointments: (params: { page?: number; limit?: number; status?: AppointmentStatus } = {}) =>
    unwrap<Paginated<Appointment>>(api.get("/appointments", { params: clean(params) })),
  createAppointment: async (input: { doctorId: string; scheduledAt: string; reason?: string }) =>
    (await unwrap<{ appointment: Appointment }>(api.post("/appointments", input))).appointment,
  updateAppointment: async (id: string, input: { status: AppointmentStatus; reason?: string }) =>
    (await unwrap<{ appointment: Appointment }>(api.patch(`/appointments/${id}/status`, input))).appointment,

  getDonorProfile: async () =>
    (await unwrap<{ profile: DonorProfile | null }>(api.get("/donors/me"))).profile,
  saveDonorProfile: async (input: {
    donationTypes: DonationType[];
    bloodGroup?: BloodGroup;
    city: string;
    state: string;
    available: boolean;
    consentGranted: boolean;
  }) =>
    (await unwrap<{ profile: DonorProfile }>(api.put("/donors/me", input))).profile,
  createDonorRequest: async (input: {
    donationType: DonationType;
    bloodGroup?: BloodGroup;
    city: string;
    state: string;
  }) => (await unwrap<{ request: DonorRequest }>(api.post("/donor-requests", input))).request,
  listDonorRequests: (params: { page?: number; limit?: number } = {}) =>
    unwrap<Paginated<DonorRequest>>(api.get("/donor-requests", { params })),
  updateDonorRequest: async (id: string, status: "cancelled" | "fulfilled") =>
    (await unwrap<{ request: DonorRequest }>(api.patch(`/donor-requests/${id}/status`, { status }))).request,

  listEmergencies: (params: { page?: number; limit?: number; status?: EmergencyStatus } = {}) =>
    unwrap<Paginated<EmergencyCase> & { simulationNotice: string }>(
      api.get("/emergencies", { params: clean(params) }),
    ),
  createEmergency: async (input: {
    location: { city: string; state: string; address?: string };
    urgency: "urgent" | "critical";
    description: string;
  }) => (await unwrap<{ emergency: EmergencyCase }>(api.post("/emergencies", input))).emergency,
  claimEmergency: async (id: string) =>
    (await unwrap<{ emergency: EmergencyCase }>(api.post(`/emergencies/${id}/claim`))).emergency,
  updateEmergency: async (id: string, status: "en_route" | "arrived" | "completed") =>
    (await unwrap<{ emergency: EmergencyCase }>(api.patch(`/emergencies/${id}/status`, { status }))).emergency,
  cancelEmergency: async (id: string) =>
    (await unwrap<{ emergency: EmergencyCase }>(api.post(`/emergencies/${id}/cancel`))).emergency,

  listFacilities: (params: { page?: number; limit?: number; city?: string; state?: string; type?: FacilityType } = {}) =>
    unwrap<Paginated<Facility>>(api.get("/facilities", { params: clean(params) })),
  createFacility: async (input: {
    name: string;
    type: FacilityType;
    address: { city: string; state: string; country: string; pincode?: string };
    supportedServices: string[];
    contactPhone?: string;
    contactEmail?: string;
  }) => (await unwrap<{ facility: Facility }>(api.post("/facilities", input))).facility,
  verifyFacility: async (id: string, input: { status: FacilityStatus; notes?: string }) =>
    (await unwrap<{ facility: Facility }>(api.patch(`/admin/facilities/${id}/verification`, input))).facility,

  getAdminOverview: () => unwrap<AdminOverview>(api.get("/admin/overview")),
  listAdminResponders: (params: { page?: number; limit?: number } = {}) =>
    unwrap<Paginated<AdminResponder>>(api.get("/admin/responders", { params })),
  setResponderAuthorization: async (id: string, authorized: boolean) =>
    unwrap<{ userId: string; authorized: boolean; authorizedAt: string | null }>(
      api.patch(`/admin/responders/${id}/authorization`, { authorized }),
    ),
  listNotifications: (params: { page?: number; limit?: number } = {}) =>
    unwrap<Paginated<NotificationItem> & { unreadCount: number }>(api.get("/notifications", { params })),
  markNotificationRead: async (id: string) =>
    (await unwrap<{ notification: NotificationItem }>(api.patch(`/notifications/${id}/read`))).notification,
};
