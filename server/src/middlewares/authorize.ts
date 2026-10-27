import type { NextFunction, Request, RequestHandler, Response } from "express";
import type { Role } from "../constants/roles.js";
import { recordAudit, getRequestContext } from "../services/audit.service.js";
import { ForbiddenError, UnauthorizedError } from "../utils/api-error.js";

/** Typed accessor: throws 401 if `authenticate` did not run. */
export const requireAuth = (req: Request): NonNullable<Request["auth"]> => {
  if (!req.auth) throw new UnauthorizedError("Authentication required", "AUTH_REQUIRED");
  return req.auth;
};

/** Allows only the listed roles. Must run after `authenticate`. */
const authorize = (...allowed: Role[]): RequestHandler => {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const auth = requireAuth(req);
      if (!allowed.includes(auth.role)) {
        await recordAudit(
          {
            actor: auth,
            action: "access.denied",
            resourceType: "route",
            resourceId: `${req.method} ${req.baseUrl}${req.path}`,
            outcome: "denied",
          },
          getRequestContext(req),
        );
        throw new ForbiddenError("You do not have permission to perform this action.");
      }
      next();
    } catch (error) {
      next(error);
    }
  };
};

export default authorize;
