import { Types } from "mongoose";
import { findDoctorProfileByUserId, listVerifiedDoctorProfiles } from "../repository/doctor-profile.repository.js";
import {
  createAppointment,
  findAppointmentById,
  listAppointments,
  listAppointmentsByIds,
  listAppointmentsForDoctorBetween,
  updateAppointmentStatus,
} from "../repository/appointment.repository.js";
import { findUserById, findUsersByIds } from "../repository/user.repository.js";
import type { AppointmentEntity } from "../models/appointment.model.js";
import { ConflictError, ForbiddenError, NotFoundError } from "../utils/api-error.js";
import { buildPagination } from "../utils/pagination.js";
import { recordAudit, type RequestContext } from "./audit.service.js";
import { notify } from "./notification.service.js";
import type { Actor } from "./patient.service.js";

const isDuplicateKey = (error: unknown): boolean =>
  error instanceof Error && (error as { code?: unknown }).code === 11000;

const present = (appointment: AppointmentEntity, names: Map<string, string>) => ({
  id: String(appointment._id),
  patient: { id: String(appointment.patientId), name: names.get(String(appointment.patientId)) ?? "Unknown" },
  doctor: { id: String(appointment.doctorId), name: names.get(String(appointment.doctorId)) ?? "Unknown" },
  scheduledAt: appointment.scheduledAt,
  durationMinutes: appointment.durationMinutes,
  reason: appointment.reason ?? null,
  status: appointment.status,
  cancellation: appointment.cancellation
    ? { cancelledAt: appointment.cancellation.cancelledAt, reason: appointment.cancellation.reason ?? null }
    : null,
  createdAt: appointment.createdAt,
  updatedAt: appointment.updatedAt,
});

export const listPublicDoctors = async (
  filters: { specialty?: string | undefined; page: number; limit: number },
) => {
  const { items, total } = await listVerifiedDoctorProfiles(filters);
  const users = await findUsersByIds(items.map((profile) => profile.userId));
  const byId = new Map(users.map((user) => [String(user._id), user]));
  return {
    items: items.flatMap((profile) => {
      const user = byId.get(String(profile.userId));
      if (!user || user.status !== "active") return [];
      return [{
        id: String(user._id),
        name: `Dr. ${user.firstName} ${user.lastName}`.trim(),
        specialties: profile.specialties,
        qualifications: profile.qualifications,
        yearsOfExperience: profile.yearsOfExperience ?? null,
        bio: profile.bio ?? null,
        consultationFee: profile.consultationFee ?? null,
      }];
    }),
    pagination: buildPagination(filters.page, filters.limit, total),
  };
};

export const getPublicDoctor = async (doctorId: string) => {
  const [user, profile] = await Promise.all([
    findUserById(doctorId),
    findDoctorProfileByUserId(doctorId),
  ]);
  if (!user || user.role !== "doctor" || user.status !== "active" || profile?.verificationStatus !== "verified") {
    throw new NotFoundError("Doctor not found");
  }
  return {
    id: String(user._id),
    name: `Dr. ${user.firstName} ${user.lastName}`.trim(),
    specialties: profile.specialties,
    qualifications: profile.qualifications,
    yearsOfExperience: profile.yearsOfExperience ?? null,
    bio: profile.bio ?? null,
    consultationFee: profile.consultationFee ?? null,
  };
};

export const getDoctorAvailability = async (
  doctorId: string,
  from: Date,
  days: number,
) => {
  const profile = await findDoctorProfileByUserId(doctorId);
  const user = await findUserById(doctorId);
  if (!profile || profile.verificationStatus !== "verified" || user?.status !== "active") {
    throw new NotFoundError("Doctor not found");
  }
  const fromDay = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
  const until = new Date(fromDay.getTime() + days * 24 * 60 * 60 * 1000);
  const appointments = await listAppointmentsForDoctorBetween(doctorId, fromDay, until);
  const occupied = new Set(appointments.map((item) => item.scheduledAt.toISOString()));
  const slots: Date[] = [];

  for (let day = 0; day < days; day += 1) {
    const date = new Date(fromDay.getTime() + day * 24 * 60 * 60 * 1000);
    for (const window of profile.weeklyAvailability.filter((slot) => slot.dayOfWeek === date.getUTCDay())) {
      const startMinute = Number(window.startTime.slice(0, 2)) * 60 + Number(window.startTime.slice(3));
      const endMinute = Number(window.endTime.slice(0, 2)) * 60 + Number(window.endTime.slice(3));
      for (let minute = startMinute; minute + 30 <= endMinute; minute += 30) {
        const slot = new Date(date.getTime() + minute * 60_000);
        if (slot > new Date() && !occupied.has(slot.toISOString())) slots.push(slot);
      }
    }
  }
  return {
    doctorId,
    timezone: "UTC",
    durationMinutes: 30,
    slots,
  };
};

export const createForPatient = async (
  patientId: string,
  input: { doctorId: string; scheduledAt: Date; reason?: string | undefined },
  ctx: RequestContext,
) => {
  const doctor = await findDoctorProfileByUserId(input.doctorId);
  const user = await findUserById(input.doctorId);
  if (!doctor || doctor.verificationStatus !== "verified" || user?.role !== "doctor" || user.status !== "active") {
    throw new NotFoundError("Doctor not found");
  }
  const start = input.scheduledAt;
  const day = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
  const scheduledSlot = await getDoctorAvailability(input.doctorId, day, 1);
  if (!scheduledSlot.slots.some((slot) => slot.getTime() === start.getTime())) {
    throw new ConflictError("This appointment slot is not available.", "APPOINTMENT_SLOT_UNAVAILABLE");
  }

  let appointment: AppointmentEntity;
  try {
    appointment = await createAppointment({
      patientId: new Types.ObjectId(patientId),
      doctorId: new Types.ObjectId(input.doctorId),
      scheduledAt: input.scheduledAt,
      ...(input.reason ? { reason: input.reason } : {}),
    });
  } catch (error) {
    if (isDuplicateKey(error)) {
      throw new ConflictError("This appointment slot was just taken.", "APPOINTMENT_SLOT_UNAVAILABLE");
    }
    throw error;
  }

  await Promise.all([
    notify(patientId, "appointment", "Appointment requested", "Your appointment request is recorded. This prototype does not send an external booking confirmation."),
    notify(input.doctorId, "appointment", "New appointment request", "A patient has requested an appointment in the prototype."),
  ]);
  await recordAudit({
    actor: { userId: patientId, role: "patient" },
    action: "appointment.create",
    resourceType: "appointment",
    resourceId: String(appointment._id),
    outcome: "success",
    metadata: { status: appointment.status, scheduledAt: appointment.scheduledAt.toISOString() },
  }, ctx);
  const users = await findUsersByIds([appointment.patientId, appointment.doctorId]);
  return present(appointment, new Map(users.map((item) => [String(item._id), `${item.firstName} ${item.lastName}`.trim()])));
};

export const listForActor = async (
  actor: Actor,
  filters: {
    page: number;
    limit: number;
    status?: AppointmentEntity["status"] | undefined;
    from?: string | undefined;
    to?: string | undefined;
  },
) => {
  if (actor.role !== "patient" && actor.role !== "doctor") {
    throw new ForbiddenError("Only patients and doctors can view appointments.");
  }
  const { items, total } = await listAppointments(actor.userId, actor.role, filters.page, filters.limit, {
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.from ? { from: new Date(filters.from) } : {}),
    ...(filters.to ? { to: new Date(filters.to) } : {}),
  });
  const users = await findUsersByIds(items.flatMap((item) => [item.patientId, item.doctorId]));
  const names = new Map(users.map((user) => [String(user._id), `${user.firstName} ${user.lastName}`.trim()]));
  return { items: items.map((item) => present(item, names)), pagination: buildPagination(filters.page, filters.limit, total) };
};

export const updateStatus = async (
  actor: Actor,
  id: string,
  input: { status: AppointmentEntity["status"]; reason?: string | undefined },
  ctx: RequestContext,
) => {
  const appointment = await findAppointmentById(id);
  if (!appointment) throw new NotFoundError("Appointment not found");
  const patient = actor.role === "patient" && String(appointment.patientId) === actor.userId;
  const doctor = actor.role === "doctor" && String(appointment.doctorId) === actor.userId;
  if (!patient && !doctor) throw new NotFoundError("Appointment not found");

  const allowed =
    patient && input.status === "cancelled"
      ? ["requested", "confirmed"] as const
      : doctor && input.status === "confirmed"
        ? ["requested"] as const
        : doctor && input.status === "cancelled"
          ? ["requested", "confirmed"] as const
          : doctor && input.status === "completed" && appointment.scheduledAt <= new Date()
            ? ["confirmed"] as const
            : [];
  if (!allowed.length) throw new ForbiddenError("You cannot make that appointment status change.", "APPOINTMENT_TRANSITION_FORBIDDEN");

  const updated = await updateAppointmentStatus(id, [...allowed], {
    status: input.status,
    ...(input.status === "cancelled"
      ? { cancellation: { cancelledBy: new Types.ObjectId(actor.userId), cancelledAt: new Date(), ...(input.reason ? { reason: input.reason } : {}) } }
      : {}),
  });
  if (!updated) throw new ConflictError("The appointment status has changed. Refresh and try again.", "APPOINTMENT_STATUS_CHANGED");

  const otherParty = patient ? String(updated.doctorId) : String(updated.patientId);
  await notify(otherParty, "appointment", `Appointment ${updated.status}`, "An appointment status changed in the prototype. No external service has been contacted.");
  await recordAudit({
    actor,
    action: "appointment.status.update",
    resourceType: "appointment",
    resourceId: id,
    outcome: "success",
    metadata: { from: appointment.status, to: updated.status },
  }, ctx);
  const users = await findUsersByIds([updated.patientId, updated.doctorId]);
  return present(updated, new Map(users.map((user) => [String(user._id), `${user.firstName} ${user.lastName}`.trim()])));
};
