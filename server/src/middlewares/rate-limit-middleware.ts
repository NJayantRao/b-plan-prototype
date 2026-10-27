import type { RequestHandler } from "express";
import { rateLimit } from "express-rate-limit";
import { ENV } from "../config/env.js";
import { TooManyRequestsError } from "../utils/api-error.js";

const createLimiter = (windowMs: number, limit: number): RequestHandler =>
  rateLimit({
    windowMs,
    limit: ENV.isTest ? 10_000 : limit,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    handler: (_req, _res, next) =>
      next(new TooManyRequestsError("Too many requests. Please slow down.", "RATE_LIMITED")),
  });

// In-memory store: correct for a single server instance. Use a Redis-backed
// store if the API is ever scaled horizontally.

/** Sign-in and token refresh, per IP. */
export const authLimiter: RequestHandler = createLimiter(15 * 60 * 1000, 30);
/** Sign-up and OTP endpoints, per IP. */
export const signupLimiter: RequestHandler = createLimiter(60 * 60 * 1000, 20);
