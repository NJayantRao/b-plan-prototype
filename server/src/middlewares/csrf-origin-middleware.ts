import type { NextFunction, Request, Response } from "express";
import { ENV } from "../config/env.js";
import { ForbiddenError } from "../utils/api-error.js";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * CSRF defence for cookie-authenticated, state-changing requests: browsers
 * always attach an `Origin` header to cross-site POST/PATCH/DELETE, so any
 * origin that is not our frontend is rejected. This complements the
 * SameSite cookie attribute and the CORS allow-list.
 * Non-browser clients (curl, tests) send no Origin and are not CSRF vectors,
 * since they cannot ride on a victim's cookies.
 */
const csrfOriginGuard = (req: Request, _res: Response, next: NextFunction): void => {
  if (SAFE_METHODS.has(req.method)) return next();

  const origin = req.get("origin");
  if (origin && !ENV.allowedOrigins.includes(origin)) {
    return next(new ForbiddenError("Cross-site request blocked", "CSRF_BLOCKED"));
  }
  next();
};

export default csrfOriginGuard;
