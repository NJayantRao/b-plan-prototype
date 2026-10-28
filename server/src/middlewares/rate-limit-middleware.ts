import type { RequestHandler } from "express";
import { ipKeyGenerator, rateLimit } from "express-rate-limit";
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

/**
 * AI endpoints are slow and cost money: limit them per signed-in user
 * (not per IP) so one person can't exhaust the quota. Needs `authenticate` first.
 */
export const aiLimiter: RequestHandler = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: ENV.isTest ? 10_000 : 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  keyGenerator: (req) => req.auth?.userId ?? ipKeyGenerator(req.ip ?? ""),
  handler: (_req, _res, next) =>
    next(new TooManyRequestsError("You've reached the hourly limit for AI assessments.", "AI_RATE_LIMITED")),
});
