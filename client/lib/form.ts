import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import { ApiClientError } from "@/lib/api/errors";

/**
 * Copies the API's per-field validation messages onto the form.
 * Returns true if at least one field error was applied.
 */
export function applyServerFieldErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  knownFields: readonly string[],
  /** Maps server field paths to form field names (e.g. "location.city" -> "city"). */
  fieldMap: Readonly<Record<string, string>> = {},
): boolean {
  if (!(error instanceof ApiClientError)) return false;
  let applied = false;
  for (const [serverField, message] of Object.entries(error.fieldErrors)) {
    const field = fieldMap[serverField] ?? serverField;
    if (knownFields.includes(field)) {
      setError(field as Path<T>, { type: "server", message });
      applied = true;
    }
  }
  return applied;
}

/** A concise, human-readable message for toasts: prefers the first field error. */
export function describeError(error: unknown): string {
  if (error instanceof ApiClientError) {
    const first = Object.entries(error.fieldErrors)[0];
    if (first) return `${first[0].replace(/\./g, " › ")}: ${first[1]}`;
    return error.message;
  }
  return error instanceof Error ? error.message : "Something went wrong.";
}
