import { z } from "zod";
import { APPOINTMENT_STATUSES } from "../constants/supporting.js";
import { paginationSchema } from "../utils/pagination.js";
import { objectIdSchema } from "./common.validator.js";

const slotDate = z.iso
  .datetime({ offset: true })
  .transform((value) => new Date(value))
  .refine((value) => value.getTime() > Date.now(), "Appointment must be in the future")
  .refine(
    (value) => value.getUTCSeconds() === 0 && value.getUTCMilliseconds() === 0 && [0, 30].includes(value.getUTCMinutes()),
    "Appointments must start on a 30-minute boundary",
  );

export const createAppointmentSchema = z
  .object({
    doctorId: objectIdSchema,
    scheduledAt: slotDate,
    reason: z.string().trim().min(1).max(1000).optional(),
  })
  .strict();

export const listAppointmentsQuerySchema = paginationSchema.extend({
  status: z.enum(APPOINTMENT_STATUSES).optional(),
  from: z.iso.datetime({ offset: true }).optional(),
  to: z.iso.datetime({ offset: true }).optional(),
});

export const updateAppointmentStatusSchema = z
  .object({
    status: z.enum(APPOINTMENT_STATUSES),
    reason: z.string().trim().min(1).max(500).optional(),
  })
  .strict();

export const doctorDirectoryQuerySchema = paginationSchema.extend({
  specialty: z.string().trim().min(1).max(100).optional(),
});

export const doctorIdParamSchema = z.object({ id: objectIdSchema });
export const doctorAvailabilityQuerySchema = z
  .object({
    from: z.iso.date().optional(),
    days: z.coerce.number().int().min(1).max(31).default(14),
  })
  .strict();
