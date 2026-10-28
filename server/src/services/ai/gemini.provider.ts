import { ApiError, GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { AiError, aiAssessmentSchema, type AiInput, type AiProvider } from "./ai-types.js";
import { SYSTEM_INSTRUCTION, buildUserPrompt } from "./prompt.js";

/** The slice of the Gen AI SDK we use: lets tests inject a fake client. */
export interface GeminiClientLike {
  models: {
    generateContent(params: {
      model: string;
      contents: string;
      config: Record<string, unknown>;
    }): Promise<{ text?: string | undefined }>;
  };
}

// Single source of truth: the same Zod schema validates output AND is sent to
// Gemini as the response schema.
const RESPONSE_JSON_SCHEMA = (() => {
  const { $schema: _ignored, ...schema } = z.toJSONSchema(aiAssessmentSchema) as Record<string, unknown>;
  return schema;
})();

export class GeminiProvider implements AiProvider {
  readonly mode = "gemini" as const;
  private readonly client: GeminiClientLike;

  constructor(
    apiKey: string,
    readonly model: string,
    client?: GeminiClientLike,
  ) {
    this.client = client ?? (new GoogleGenAI({ apiKey }) as unknown as GeminiClientLike);
  }

  async generate(input: AiInput, signal: AbortSignal): Promise<unknown> {
    const response = await this.client.models.generateContent({
      model: this.model,
      contents: buildUserPrompt(input),
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseJsonSchema: RESPONSE_JSON_SCHEMA,
        temperature: 0.2,
        maxOutputTokens: 4096,
        abortSignal: signal,
      },
    });

    const text = response.text;
    if (!text) throw new AiError("AI_INVALID_OUTPUT");
    try {
      return JSON.parse(text) as unknown;
    } catch {
      throw new AiError("AI_INVALID_OUTPUT");
    }
  }
}

/** Maps any SDK/network failure to a safe, generic AiError. */
export const toAiError = (error: unknown): AiError => {
  if (error instanceof AiError) return error;
  if (error instanceof ApiError) {
    if (error.status === 429) return new AiError("AI_RATE_LIMITED");
    return new AiError("AI_PROVIDER_ERROR");
  }
  if (error instanceof Error && (error.name === "AbortError" || /abort|timeout|timed out/i.test(error.message))) {
    return new AiError("AI_TIMEOUT");
  }
  return new AiError("AI_PROVIDER_ERROR");
};
