import type { Types } from "mongoose";
import { Appointment, type AppointmentEntity } from "../models/appointment.model.js";

type Id = string | Types.ObjectId;

export const createAppointment = async (
  data: Omit<AppointmentEntity, "_id" | "createdAt" | "updatedAt" | "status" | "durationMinutes" | "slotActive">,
) => {
  const appointment = await Appointment.create({ ...data, status: "requested", durationMinutes: 30, slotActive: true });
  return appointment.toObject() as AppointmentEntity;
};

export const findAppointmentById = (id: Id) =>
  Appointment.findById(id).lean<AppointmentEntity>().exec();

export const listAppointments = async (
  actorId: Id,
  role: "patient" | "doctor",
  page: number,
  limit: number,
  filters: { status?: AppointmentEntity["status"]; from?: Date; to?: Date } = {},
) => {
  const filter = {
    ...(role === "patient" ? { patientId: actorId } : { doctorId: actorId }),
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.from || filters.to
      ? {
          scheduledAt: {
            ...(filters.from ? { $gte: filters.from } : {}),
            ...(filters.to ? { $lte: filters.to } : {}),
          },
        }
      : {}),
  };
  const [items, total] = await Promise.all([
    Appointment.find(filter).sort({ scheduledAt: 1 }).skip((page - 1) * limit).limit(limit)
      .lean<AppointmentEntity[]>().exec(),
    Appointment.countDocuments(filter).exec(),
  ]);
  return { items, total };
};

export const listAppointmentsForDoctorBetween = (
  doctorId: Id,
  from: Date,
  to: Date,
) =>
  Appointment.find({
    doctorId,
    status: { $in: ["requested", "confirmed"] },
    scheduledAt: { $gte: from, $lt: to },
  })
    .select("scheduledAt")
    .lean<{ scheduledAt: Date }[]>()
    .exec();

export const listAppointmentsByIds = async (ids: Types.ObjectId[]) =>
  Appointment.find({ _id: { $in: ids } }).lean<AppointmentEntity[]>().exec();

export const updateAppointmentStatus = (
  id: Id,
  allowedStatuses: AppointmentEntity["status"][],
  update: Record<string, unknown>,
) =>
  Appointment.findOneAndUpdate(
    { _id: id, status: { $in: allowedStatuses } },
    {
      $set: {
        ...update,
        ...(update["status"] === "cancelled" || update["status"] === "completed" ? { slotActive: false } : {}),
      },
    },
    { returnDocument: "after", runValidators: true },
  )
    .lean<AppointmentEntity>()
    .exec();

export const countAppointments = () => Appointment.countDocuments().exec();
export const countUpcomingAppointments = () =>
  Appointment.countDocuments({
    scheduledAt: { $gte: new Date() },
    status: { $in: ["requested", "confirmed"] },
  }).exec();
