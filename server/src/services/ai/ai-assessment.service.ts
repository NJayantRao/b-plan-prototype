import { ENV } from "../../config/env.js";
import logger from "../../config/logger.js";
import type { AiMode } from "../../constants/clinical.js";
import {
  AI_DISCLAIMER,
  AI_LIMITATIONS,
  AiError,
  aiAssessmentSchema,
  type AiAssessmentResult,
  type AiInput,
  type AiProvider,
} from "./ai-types.js";
import { DemoProvider } from "./demo.provider.js";
import { GeminiProvider, toAiError } from "./gemini.provider.js";
import { findDisallowedContent } from "./guard.js";

export type AiRunResult =
  | {
      status: "completed";
      mode: AiMode;
      model: string;
      generatedAt: Date;
      result: AiAssessmentResult;
    }
  | {
      status: "unavailable";
      mode?: AiMode;
      model?: string;
      error: { code: string; message: string };
    };

/**
 * Chooses the provider from configuration. There is NO silent fallback from a
 * real provider to the demo: if Gemini is requested but unusable, the AI step is
 * reported as unavailable. The demo provider is only used when asked for
 * (AI_MODE=demo) or, outside production, when AI_MODE=auto and no key is set.
 */
export const selectProvider = (): AiProvider | AiError => {
  const { AI_MODE, GEMINI_API_KEY, GEMINI_MODEL, isProduction } = ENV;
  if (AI_MODE === "demo") return new DemoProvider();
  if (AI_MODE === "gemini") {
    return GEMINI_API_KEY ? new GeminiProvider(GEMINI_API_KEY, GEMINI_MODEL) : new AiError("AI_NOT_CONFIGURED");
  }
  // auto
  if (GEMINI_API_KEY) return new GeminiProvider(GEMINI_API_KEY, GEMINI_MODEL);
  return isProduction ? new AiError("AI_NOT_CONFIGURED") : new DemoProvider();
};

const unavailable = (error: AiError, provider?: AiProvider): AiRunResult => ({
  status: "unavailable",
  ...(provider ? { mode: provider.mode, model: provider.model } : {}),
  error: { code: error.code, message: error.message },
});

export const runAiAssessment = async (
  input: AiInput,
  provider: AiProvider | AiError = selectProvider(),
): Promise<AiRunResult> => {
  if (provider instanceof AiError) return unavailable(provider);

  const controller = new AbortController();
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new AiError("AI_TIMEOUT"));
    }, ENV.AI_TIMEOUT_MS);
  });

  try {
    // Race guarantees a timeout even if a provider ignores the abort signal.
    const raw = await Promise.race([provider.generate(input, controller.signal), timeout]);

    const parsed = aiAssessmentSchema.safeParse(raw);
    if (!parsed.success) throw new AiError("AI_INVALID_OUTPUT");

    const violation = findDisallowedContent(parsed.data);
    if (violation) {
      // Log only the rule id: never the content (it may include medical data).
      logger.warn(`AI output rejected by content guard (${violation})`);
      throw new AiError("AI_INVALID_OUTPUT");
    }

    return {
      status: "completed",
      mode: provider.mode,
      model: provider.model,
      generatedAt: new Date(),
      result: { ...parsed.data, disclaimer: AI_DISCLAIMER, limitations: AI_LIMITATIONS },
    };
  } catch (error) {
    const aiError = toAiError(error);
    logger.warn(`AI assessment unavailable (${aiError.code}) via ${provider.mode}`);
    return unavailable(aiError, provider);
  } finally {
    clearTimeout(timer);
  }
};
