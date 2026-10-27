import type { Response } from "express";
import type { SessionTokens } from "../services/token.service.js";
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  accessCookieOptions,
  refreshCookieOptions,
} from "./jwt.js";

export const setSessionCookies = (res: Response, tokens: SessionTokens): void => {
  res.cookie(ACCESS_COOKIE, tokens.accessToken, accessCookieOptions());
  res.cookie(REFRESH_COOKIE, tokens.refreshToken, refreshCookieOptions());
};

export const clearSessionCookies = (res: Response): void => {
  res.clearCookie(ACCESS_COOKIE, accessCookieOptions());
  res.clearCookie(REFRESH_COOKIE, refreshCookieOptions());
};
