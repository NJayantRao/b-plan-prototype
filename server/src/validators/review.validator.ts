import { z } from "zod";
import {
  AI_AGREEMENTS,
  REVIEW_URGENCIES,
  SECOND_OPINION_OUTCOMES,
} from "../constants/clinical.js";

const text = (max: number) => z.string().trim().min(1).max(max);

export const findingsSchema = z
  .object({
    impression: text(2000),
    possibleConditions: z.array(text(150)).max(10).default([]),
    recommendedTests: z.array(text(150)).max(10).default([]),
    urgency: z.enum(REVIEW_URGENCIES),
    advice: text(2000),
    notes: text(2000).optional(),
  })
  .strict();

export const aiComparisonSchema = z
  .object({
    agreement: z.enum(AI_AGREEMENTS),
    differences: text(1500).optional(),
  })
  .strict();

export const outcomeSchema = z
  .object({
    result: z.enum(SECOND_OPINION_OUTCOMES),
    summary: text(2000),
  })
  .strict();

export const createReviewSchema = z
  .object({
    findings: findingsSchema,
    aiComparison: aiComparisonSchema,
    /** Required for (and only allowed on) second-opinion reviews. */
    outcome: outcomeSchema.optional(),
  })
  .strict();
export type CreateReviewInput = z.infer<typeof createReviewSchema>;

export const amendReviewSchema = z
  .object({
    reason: z.string().trim().min(5, "Explain why you are amending").max(500),
    findings: findingsSchema.optional(),
    aiComparison: aiComparisonSchema.optional(),
    outcome: outcomeSchema.optional(),
  })
  .strict()
  .refine((v) => v.findings || v.aiComparison || v.outcome, {
    message: "Provide at least one of findings, aiComparison or outcome",
    path: ["findings"],
  });
export type AmendReviewInput = z.infer<typeof amendReviewSchema>;

export const reviewParamsSchema = z.object({
  id: z.string().regex(/^[a-f\d]{24}$/i, "Invalid id"),
  reviewId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid id"),
});
