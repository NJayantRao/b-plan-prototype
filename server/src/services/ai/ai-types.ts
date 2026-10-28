import { z } from "zod";
import type { AiMode, DurationUnit, Severity } from "../../constants/clinical.js";

/** What the AI is allowed to see: no names, emails or ids. */
export interface AiInput {
  symptoms: {
    name: string;
    severity: Severity;
    duration: { value: number; unit: DurationUnit };
  }[];
  description?: string | undefined;
  patient: {
    ageYears?: number | undefined;
    gender?: string | undefined;
    allergies: string[];
    currentMedications: string[];
    conditions: string[];
  };
}

/**
 * The only shape the AI may return. Anything else is rejected. The AI gives
 * possible explanations and next steps: never a diagnosis or a prescription.
 */
export const aiAssessmentSchema = z.object({
  summary: z.string().min(1).max(800),
  possibleExplanations: z
    .array(
      z.object({
        name: z.string().min(1).max(120),
        likelihood: z.enum(["more_likely", "possible", "less_likely"]),
        reasoning: z.string().min(1).max(500),
      }),
    )
    .min(1)
    .max(5),
  uncertainty: z.string().min(1).max(600),
  missingInformation: z.array(z.string().min(1).max(200)).max(8),
  suggestedNextSteps: z
    .array(
      z.object({
        action: z.string().min(1).max(300),
        timeframe: z.enum(["now", "within_24_hours", "within_few_days", "routine"]),
      }),
    )
    .min(1)
    .max(6),
  whenToSeekUrgentCare: z.array(z.string().min(1).max(250)).min(1).max(8),
  suggestedSpecialty: z.string().min(1).max(80).optional(),
  /** Informational only. Never used for triage or gating (see safety.service). */
  aiRiskEstimate: z.enum(["low", "medium", "high"]),
});
export type AiAssessmentCore = z.infer<typeof aiAssessmentSchema>;

/** Fixed server-side text: never taken from the model. */
export const AI_DISCLAIMER =
  "This is AI-generated, informational output. It is not a diagnosis and not medical advice, and it does not replace a doctor.";
export const AI_LIMITATIONS =
  "AI cannot examine you, cannot prescribe, and cannot rule out an emergency. If you feel seriously unwell, seek urgent care regardless of this output.";

export type AiAssessmentResult = AiAssessmentCore & {
  disclaimer: string;
  limitations: string;
};

export type AiErrorCode =
  | "AI_TIMEOUT"
  | "AI_RATE_LIMITED"
  | "AI_INVALID_OUTPUT"
  | "AI_NOT_CONFIGURED"
  | "AI_PROVIDER_ERROR";

const MESSAGES: Record<AiErrorCode, string> = {
  AI_TIMEOUT: "The AI service took too long to respond.",
  AI_RATE_LIMITED: "The AI service is busy. Please try again shortly.",
  AI_INVALID_OUTPUT: "The AI response could not be used safely.",
  AI_NOT_CONFIGURED: "AI assessment is not configured on this server.",
  AI_PROVIDER_ERROR: "The AI service is temporarily unavailable.",
};

/** Safe, user-presentable AI failure. Never carries provider internals. */
export class AiError extends Error {
  readonly code: AiErrorCode;
  constructor(code: AiErrorCode) {
    super(MESSAGES[code]);
    this.name = "AiError";
    this.code = code;
  }
}

export interface AiProvider {
  readonly mode: AiMode;
  readonly model: string;
  /** Returns the model's raw JSON output (validated later by the caller). */
  generate(input: AiInput, signal: AbortSignal): Promise<unknown>;
}
