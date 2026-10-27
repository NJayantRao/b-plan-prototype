import type { NextFunction, Request, Response } from "express";
import mongoose from "mongoose";
import { ZodError } from "zod";
import logger from "../config/logger.js";
import ApiError, {
  BadRequestError,
  ConflictError,
  InternalServerError,
  PayloadTooLargeError,
  ValidationError,
  type ErrorDetail,
} from "../utils/api-error.js";

interface MongoDuplicateKeyError extends Error {
  code: 11000;
  keyPattern?: Record<string, unknown>;
}

const isDuplicateKeyError = (err: unknown): err is MongoDuplicateKeyError =>
  err instanceof Error && (err as { code?: unknown }).code === 11000;

/** Express body-parser errors carry a `type` and an HTTP `status`. */
const isBodyParserError = (
  err: unknown,
): err is Error & { type: string; status: number } =>
  err instanceof Error &&
  typeof (err as { type?: unknown }).type === "string" &&
  typeof (err as { status?: unknown }).status === "number";

/** Converts any thrown value into a safe, typed ApiError. */
export const normalizeError = (err: unknown): ApiError => {
  if (err instanceof ApiError) return err;

  if (err instanceof ZodError) {
    const details: ErrorDetail[] = err.issues.map((issue) => ({
      field: issue.path.map(String).join("."),
      message: issue.message,
    }));
    return new ValidationError("Validation failed", details);
  }

  if (err instanceof mongoose.Error.ValidationError) {
    const details: ErrorDetail[] = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
    return new ValidationError("Validation failed", details);
  }

  if (err instanceof mongoose.Error.CastError) {
    return new BadRequestError(`Invalid value for "${err.path}"`, "INVALID_ID");
  }

  if (isDuplicateKeyError(err)) {
    const field = Object.keys(err.keyPattern ?? {})[0];
    return new ConflictError(
      field ? `A record with this ${field} already exists` : "Duplicate record",
      "DUPLICATE_KEY",
    );
  }

  if (isBodyParserError(err)) {
    if (err.type === "entity.too.large") {
      return new PayloadTooLargeError("Request body is too large");
    }
    return new BadRequestError("Malformed request body", "INVALID_BODY");
  }

  return new InternalServerError();
};

const errorMiddleware = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  const apiError = normalizeError(err);

  if (apiError.statusCode >= 500) {
    // Log the original error (with stack) but never send internals to clients.
    logger.error(err instanceof Error ? (err.stack ?? err.message) : String(err));
  } else {
    logger.warn(`${apiError.code}: ${apiError.message}`);
  }

  res.status(apiError.statusCode).json({
    statusCode: apiError.statusCode,
    success: false,
    message: apiError.message,
    code: apiError.code,
    ...(apiError.errors ? { errors: apiError.errors } : {}),
  });
};

export default errorMiddleware;
