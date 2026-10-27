import { randomUUID } from "node:crypto";
import logger from "../config/logger.js";
import { redisClient } from "../config/redis.js";
import type { Role } from "../constants/roles.js";
import { findDoctorProfileByUserId } from "../repository/doctor-profile.repository.js";
import { getOrCreatePatientProfile } from "../repository/patient-profile.repository.js";
import {
  createUser,
  findAuthUserById,
  findUserByEmail,
  findUserByEmailWithPassword,
  findUserById,
  touchLastLogin,
} from "../repository/user.repository.js";
import type { UserEntity } from "../models/user.model.js";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  TooManyRequestsError,
  UnauthorizedError,
} from "../utils/api-error.js";
import { comparePassword, hashPassword } from "../utils/bcrypt.js";
import { redisKeys } from "../utils/redis-keys.js";
import { recordAudit, type RequestContext } from "./audit.service.js";
import { sendWelcomeEmail } from "./mail.service.js";
import {
  consumeSignup,
  enforceOtpSendLimit,
  resendSignupOtp,
  startSignup,
} from "./otp.service.js";
import {
  issueSession,
  revokeSession,
  rotateSession,
  type SessionTokens,
} from "./token.service.js";

const MAX_LOGIN_FAILURES = 5;
const LOGIN_LOCK_SECONDS = 15 * 60;

// Compared against when the email is unknown, so response time doesn't reveal
// whether an account exists.
let dummyHash: Promise<string> | undefined;
const getDummyHash = () => (dummyHash ??= hashPassword(randomUUID()));

export interface RegisterInput {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

/**
 * Public registration. Always creates a *patient*. The response is identical
 * whether or not the email is already registered (no account enumeration).
 */
export const registerPatient = async (input: RegisterInput): Promise<void> => {
  const existing = await findUserByEmail(input.email);

  if (existing) {
    // Count against the same limit, but do not reveal that the account exists.
    await enforceOtpSendLimit(input.email);
    logger.info("Sign-up attempted for an already registered email");
    return;
  }

  await startSignup(input.email, {
    firstName: input.firstName,
    lastName: input.lastName,
    passwordHash: await hashPassword(input.password),
  });
};

export const resendOtp = async (email: string): Promise<void> => {
  await resendSignupOtp(email);
};

export const verifySignup = async (
  email: string,
  otp: string,
  ctx: RequestContext,
): Promise<{ user: UserEntity; tokens: SessionTokens }> => {
  const pending = await consumeSignup(email, otp);

  let user: UserEntity;
  try {
    user = await createUser({
      firstName: pending.firstName,
      lastName: pending.lastName,
      email,
      passwordHash: pending.passwordHash,
      role: "patient", // never taken from the client
      emailVerified: true,
    });
  } catch (error) {
    if ((error as { code?: number }).code === 11000) {
      throw new ConflictError("An account with this email already exists.");
    }
    throw error;
  }

  await getOrCreatePatientProfile(user._id);
  void sendWelcomeEmail(user.email, user.firstName);

  await recordAudit(
    {
      actor: { userId: String(user._id), role: user.role },
      action: "auth.register",
      resourceType: "user",
      resourceId: String(user._id),
      outcome: "success",
    },
    ctx,
  );

  return { user, tokens: await issueSession(user) };
};

export const login = async (
  email: string,
  password: string,
  ctx: RequestContext,
): Promise<{ user: UserEntity; tokens: SessionTokens }> => {
  const failuresKey = redisKeys.loginFailures(email);

  const failures = Number((await redisClient.get(failuresKey)) ?? 0);
  if (failures >= MAX_LOGIN_FAILURES) {
    throw new TooManyRequestsError(
      "Too many failed sign-in attempts. Please try again in 15 minutes.",
      "LOGIN_LOCKED",
    );
  }

  const user = await findUserByEmailWithPassword(email);
  const passwordOk = await comparePassword(
    password,
    user?.passwordHash ?? (await getDummyHash()),
  );

  if (!user || !passwordOk) {
    const count = await redisClient.incr(failuresKey);
    if (count === 1) await redisClient.expire(failuresKey, LOGIN_LOCK_SECONDS);

    await recordAudit(
      {
        actor: user ? { userId: String(user._id), role: user.role } : undefined,
        action: "auth.login",
        resourceType: "user",
        resourceId: user ? String(user._id) : undefined,
        outcome: "failure",
      },
      ctx,
    );
    // Same message for unknown email and wrong password.
    throw new UnauthorizedError("Invalid email or password.", "INVALID_CREDENTIALS");
  }

  if (user.status !== "active" || !user.emailVerified) {
    await recordAudit(
      {
        actor: { userId: String(user._id), role: user.role },
        action: "auth.login",
        resourceType: "user",
        resourceId: String(user._id),
        outcome: "denied",
        metadata: { reason: user.status !== "active" ? "inactive" : "unverified" },
      },
      ctx,
    );
    throw new ForbiddenError("This account is not active.", "ACCOUNT_INACTIVE");
  }

  await redisClient.del(failuresKey);
  await touchLastLogin(user._id);

  await recordAudit(
    {
      actor: { userId: String(user._id), role: user.role },
      action: "auth.login",
      resourceType: "user",
      resourceId: String(user._id),
      outcome: "success",
    },
    ctx,
  );

  const { passwordHash: _omit, ...safeUser } = user;
  return { user: safeUser, tokens: await issueSession(user) };
};

export const refresh = async (refreshToken: string): Promise<SessionTokens> => {
  const { tokens } = await rotateSession(refreshToken);
  return tokens;
};

export const logout = async (
  refreshToken: string | undefined,
  ctx: RequestContext,
): Promise<void> => {
  const userId = await revokeSession(refreshToken);
  const user = userId ? await findAuthUserById(userId) : null;
  if (userId && user) {
    await recordAudit(
      {
        actor: { userId, role: user.role },
        action: "auth.logout",
        resourceType: "user",
        resourceId: userId,
        outcome: "success",
      },
      ctx,
    );
  }
};

export const getCurrentUser = async (userId: string, role: Role) => {
  const user = await findUserById(userId);
  if (!user) throw new NotFoundError("User not found");

  let doctorVerificationStatus: string | undefined;
  if (role === "doctor") {
    const profile = await findDoctorProfileByUserId(user._id);
    doctorVerificationStatus = profile?.verificationStatus ?? "pending";
  }
  return { user, doctorVerificationStatus };
};
