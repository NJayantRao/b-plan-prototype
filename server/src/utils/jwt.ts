import type { CookieOptions } from "express";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { ENV } from "../config/env.js";
import { ROLES, type Role } from "../constants/roles.js";
import { UnauthorizedError } from "./api-error.js";

const ISSUER = "magadh-ventures";

export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
export const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;

export const ACCESS_COOKIE = "accessToken";
export const REFRESH_COOKIE = "refreshToken";
/** The refresh cookie is only ever sent to the auth routes. */
export const REFRESH_COOKIE_PATH = "/api/v1/auth";

const accessPayloadSchema = z.object({
  sub: z.string().min(1),
  role: z.enum(ROLES),
});
const refreshPayloadSchema = z.object({
  sub: z.string().min(1),
  jti: z.string().min(1),
});

export interface AccessTokenPayload {
  sub: string;
  role: Role;
}
export interface RefreshTokenPayload {
  sub: string;
  jti: string;
}

export const signAccessToken = (payload: AccessTokenPayload): string =>
  jwt.sign(payload, ENV.ACCESS_TOKEN_SECRET, {
    algorithm: "HS256",
    expiresIn: ACCESS_TOKEN_TTL_SECONDS,
    issuer: ISSUER,
  });

export const signRefreshToken = (payload: RefreshTokenPayload): string =>
  jwt.sign(payload, ENV.REFRESH_TOKEN_SECRET, {
    algorithm: "HS256",
    expiresIn: REFRESH_TOKEN_TTL_SECONDS,
    issuer: ISSUER,
  });

const verify = (token: string, secret: string): unknown => {
  try {
    return jwt.verify(token, secret, { algorithms: ["HS256"], issuer: ISSUER });
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new UnauthorizedError("Token expired", "TOKEN_EXPIRED");
    }
    throw new UnauthorizedError("Invalid token", "INVALID_TOKEN");
  }
};

export const verifyAccessToken = (token: string): AccessTokenPayload => {
  const parsed = accessPayloadSchema.safeParse(verify(token, ENV.ACCESS_TOKEN_SECRET));
  if (!parsed.success) throw new UnauthorizedError("Invalid token", "INVALID_TOKEN");
  return parsed.data;
};

export const verifyRefreshToken = (token: string): RefreshTokenPayload => {
  const parsed = refreshPayloadSchema.safeParse(verify(token, ENV.REFRESH_TOKEN_SECRET));
  if (!parsed.success) throw new UnauthorizedError("Invalid token", "INVALID_TOKEN");
  return parsed.data;
};

const baseCookieOptions = (): CookieOptions => ({
  httpOnly: true,
  secure: ENV.cookieSecure,
  sameSite: ENV.COOKIE_SAME_SITE,
  ...(ENV.COOKIE_DOMAIN ? { domain: ENV.COOKIE_DOMAIN } : {}),
});

export const accessCookieOptions = (): CookieOptions => ({
  ...baseCookieOptions(),
  path: "/",
  maxAge: ACCESS_TOKEN_TTL_SECONDS * 1000,
});

export const refreshCookieOptions = (): CookieOptions => ({
  ...baseCookieOptions(),
  path: REFRESH_COOKIE_PATH,
  maxAge: REFRESH_TOKEN_TTL_SECONDS * 1000,
});
