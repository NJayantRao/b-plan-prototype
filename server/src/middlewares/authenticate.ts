import type { NextFunction, Request, Response } from "express";
import { findAuthUserById } from "../repository/user.repository.js";
import { UnauthorizedError } from "../utils/api-error.js";
import { ACCESS_COOKIE, verifyAccessToken } from "../utils/jwt.js";

const extractToken = (req: Request): string | undefined => {
  const cookieToken = (req.cookies as Record<string, unknown> | undefined)?.[ACCESS_COOKIE];
  if (typeof cookieToken === "string" && cookieToken) return cookieToken;

  const header = req.get("authorization");
  if (header?.startsWith("Bearer ")) return header.slice(7).trim() || undefined;
  return undefined;
};

/**
 * Authenticates the request. The signed token identifies the user, but the
 * role and status are re-read from MongoDB on every request, so suspending an
 * account or changing a role takes effect immediately rather than when the
 * 15-minute token expires.
 */
const authenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const token = extractToken(req);
    if (!token) throw new UnauthorizedError("Authentication required", "AUTH_REQUIRED");

    const payload = verifyAccessToken(token);
    const user = await findAuthUserById(payload.sub);
    if (!user || user.status !== "active") {
      throw new UnauthorizedError("Authentication required", "AUTH_REQUIRED");
    }

    req.auth = { userId: String(user._id), role: user.role };
    next();
  } catch (error) {
    next(error);
  }
};

export default authenticate;
