import { z } from "zod";
import { TASK_STATUSES, TASK_TYPES } from "../constants/clinical.js";
import { paginationSchema } from "../utils/pagination.js";
import { objectIdSchema } from "./common.validator.js";

const text = (max: number) => z.string().trim().min(1).max(max);

const todayUtc = () => {
  const now = new Date();
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
};

/** YYYY-MM-DD, today or later. */
const futureDate = z.iso
  .date("Use the format YYYY-MM-DD")
  .transform((v) => new Date(`${v}T00:00:00.000Z`))
  .refine((d) => d.getTime() >= todayUtc(), { message: "Date cannot be in the past" });

const taskInputSchema = z
  .object({
    title: text(200),
    description: text(1000).optional(),
    type: z.enum(TASK_TYPES),
    dueDate: futureDate.optional(),
  })
  .strict();

const referralSchema = z
  .object({
    specialty: text(100),
    reason: text(500),
    urgency: z.enum(["routine", "soon", "urgent"]),
  })
  .strict();

export const createCarePlanSchema = z
  .object({
    assessmentId: objectIdSchema,
    title: text(150),
    summary: text(2000).optional(),
    tasks: z.array(taskInputSchema).min(1, "Add at least one task").max(30),
    referrals: z.array(referralSchema).max(10).default([]),
    followUpDate: futureDate.optional(),
  })
  .strict();
export type CreateCarePlanInput = z.infer<typeof createCarePlanSchema>;

const atLeastOne = (v: object) => Object.values(v).some((x) => x !== undefined);

/** Patients can only report progress on their own tasks. */
export const patientTaskPatchSchema = z
  .object({
    status: z.enum(TASK_STATUSES).optional(),
    notes: text(1000).optional(),
  })
  .strict()
  .refine(atLeastOne, { message: "Nothing to update" });

/** The plan's doctor may also adjust the task itself. */
export const doctorTaskPatchSchema = z
  .object({
    status: z.enum(TASK_STATUSES).optional(),
    notes: text(1000).optional(),
    title: text(200).optional(),
    description: text(1000).optional(),
    dueDate: futureDate.optional(),
  })
  .strict()
  .refine(atLeastOne, { message: "Nothing to update" });

export const taskParamsSchema = z.object({ id: objectIdSchema, taskId: objectIdSchema });

export const listCarePlansQuerySchema = paginationSchema.extend({
  assessmentId: objectIdSchema.optional(),
});
