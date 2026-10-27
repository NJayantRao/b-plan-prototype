import axios from "axios";
import type { ApiErrorBody } from "@/types/api";

/** Normalised error thrown by every API call. Never contains raw axios internals. */
export class ApiClientError extends Error {
  readonly status: number;
  readonly code: string;
  /** Server-side validation messages keyed by field path (e.g. "location.city"). */
  readonly fieldErrors: Record<string, string>;

  constructor(
    message: string,
    status: number,
    code: string,
    fieldErrors: Record<string, string> = {},
  ) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}

export const toApiError = (error: unknown): ApiClientError => {
  if (error instanceof ApiClientError) return error;

  if (axios.isAxiosError<ApiErrorBody>(error)) {
    const body = error.response?.data;

    if (error.response && body && typeof body === "object" && "message" in body) {
      const fieldErrors: Record<string, string> = {};
      for (const item of body.errors ?? []) {
        if (item.field && !(item.field in fieldErrors)) {
          fieldErrors[item.field] = item.message;
        }
      }
      return new ApiClientError(
        body.message,
        error.response.status,
        body.code ?? "UNKNOWN_ERROR",
        fieldErrors,
      );
    }

    if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") {
      return new ApiClientError(
        "The request timed out. Please try again.",
        0,
        "TIMEOUT",
      );
    }
    if (!error.response) {
      return new ApiClientError(
        "Can't reach the server. Check your connection and try again.",
        0,
        "NETWORK_ERROR",
      );
    }
    return new ApiClientError(
      "Something went wrong. Please try again.",
      error.response.status,
      "UNKNOWN_ERROR",
    );
  }

  return new ApiClientError(
    error instanceof Error ? error.message : "Something went wrong.",
    0,
    "UNKNOWN_ERROR",
  );
};

export const getErrorMessage = (error: unknown): string =>
  toApiError(error).message;
