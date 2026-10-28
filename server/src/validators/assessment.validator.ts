import { z } from "zod";
import { DURATION_UNITS, SEVERITIES } from "../constants/clinical.js";
import { paginationSchema } from "../utils/pagination.js";

const symptomSchema = z
  .object({
    name: z.string().trim().min(1, "Describe the symptom").max(100),
    severity: z.enum(SEVERITIES),
    duration: z
      .object({
        value: z.number().int().min(1).max(1000),
        unit: z.enum(DURATION_UNITS),
      })
      .strict(),
  })
  .strict();

// `.strict()`: clients cannot send patientId, status, priority, ai, etc.
export const createAssessmentSchema = z
  .object({
    symptoms: z.array(symptomSchema).min(1, "Add at least one symptom").max(10),
    description: z.string().trim().max(2000).optional(),
  })
  .strict();
export type CreateAssessmentInput = z.infer<typeof createAssessmentSchema>;

export const listAssessmentsQuerySchema = paginationSchema.extend({
  scope: z.enum(["queue", "mine"]).optional(),
});
