import type { Request, RequestHandler, Response } from "express";
import { requireAuth } from "../middlewares/authorize.js";
import { getRequestContext } from "../services/audit.service.js";
import * as authService from "../services/auth.service.js";
import ApiResponse from "../utils/api-response.js";
import AsyncHandler from "../utils/async-handler.js";
import { UnauthorizedError } from "../utils/api-error.js";
import { clearSessionCookies, setSessionCookies } from "../utils/cookies.js";
import { REFRESH_COOKIE } from "../utils/jwt.js";
import { toPublicUser } from "../utils/mappers.js";
import {
  loginSchema,
  registerSchema,
  sendOtpSchema,
  verifyOtpSchema,
} from "../validators/auth.validator.js";

// Identical for new and already-registered emails (no account enumeration).
const CODE_SENT_MESSAGE =
  "If this email can be registered, a verification code has been sent.";

const readRefreshCookie = (req: Request): string | undefined => {
  const value = (req.cookies as Record<string, unknown> | undefined)?.[REFRESH_COOKIE];
  return typeof value === "string" && value ? value : undefined;
};

export const register: RequestHandler = AsyncHandler(
  async (req: Request, res: Response) => {
    const input = registerSchema.parse(req.body);
    await authService.registerPatient(input);
    res.status(202).json(new ApiResponse(202, CODE_SENT_MESSAGE));
  },
);

export const sendOtp: RequestHandler = AsyncHandler(
  async (req: Request, res: Response) => {
    const { email } = sendOtpSchema.parse(req.body);
    await authService.resendOtp(email);
    res.status(202).json(new ApiResponse(202, CODE_SENT_MESSAGE));
  },
);

export const verifyOtp: RequestHandler = AsyncHandler(
  async (req: Request, res: Response) => {
    const { email, otp } = verifyOtpSchema.parse(req.body);
    const { user, tokens } = await authService.verifySignup(
      email,
      otp,
      getRequestContext(req),
    );
    setSessionCookies(res, tokens);
    res
      .status(201)
      .json(new ApiResponse(201, "Account verified", { user: toPublicUser(user) }));
  },
);

export const login: RequestHandler = AsyncHandler(
  async (req: Request, res: Response) => {
    const { email, password } = loginSchema.parse(req.body);
    const { user, tokens } = await authService.login(
      email,
      password,
      getRequestContext(req),
    );
    setSessionCookies(res, tokens);
    res
      .status(200)
      .json(new ApiResponse(200, "Signed in", { user: toPublicUser(user) }));
  },
);

export const refreshToken: RequestHandler = AsyncHandler(
  async (req: Request, res: Response) => {
    const token = readRefreshCookie(req);
    if (!token) throw new UnauthorizedError("Authentication required", "AUTH_REQUIRED");
    try {
      const tokens = await authService.refresh(token);
      setSessionCookies(res, tokens);
      res.status(200).json(new ApiResponse(200, "Session refreshed"));
    } catch (error) {
      clearSessionCookies(res);
      throw error;
    }
  },
);

export const logout: RequestHandler = AsyncHandler(
  async (req: Request, res: Response) => {
    await authService.logout(readRefreshCookie(req), getRequestContext(req));
    clearSessionCookies(res);
    res.status(200).json(new ApiResponse(200, "Signed out"));
  },
);

export const me: RequestHandler = AsyncHandler(
  async (req: Request, res: Response) => {
    const auth = requireAuth(req);
    const { user, doctorVerificationStatus } = await authService.getCurrentUser(
      auth.userId,
      auth.role,
    );
    res.status(200).json(
      new ApiResponse(200, "Current user", {
        user: toPublicUser(user),
        ...(doctorVerificationStatus ? { doctorVerificationStatus } : {}),
      }),
    );
  },
);
