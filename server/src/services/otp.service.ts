import { z } from "zod";
import logger from "../config/logger.js";
import { redisClient } from "../config/redis.js";
import { TooManyRequestsError, UnauthorizedError } from "../utils/api-error.js";
import { comparePassword, hashPassword } from "../utils/bcrypt.js";
import { generateOtp } from "../utils/crypto.js";
import { redisKeys } from "../utils/redis-keys.js";
import { sendOtpEmail } from "./mail.service.js";

const OTP_TTL_SECONDS = 10 * 60;
const SEND_WINDOW_SECONDS = 60 * 60;
const MAX_SENDS_PER_WINDOW = 5;
const MAX_VERIFY_ATTEMPTS = 5;

const pendingSignupSchema = z.object({
  firstName: z.string(),
  lastName: z.string(),
  passwordHash: z.string(),
  otpHash: z.string(),
});

export interface SignupData {
  firstName: string;
  lastName: string;
  passwordHash: string;
}

/** Counts OTP sends per email; throws once the hourly limit is exceeded. */
export const enforceOtpSendLimit = async (email: string): Promise<void> => {
  const key = redisKeys.otpSendCount(email);
  const count = await redisClient.incr(key);
  if (count === 1) await redisClient.expire(key, SEND_WINDOW_SECONDS);
  if (count > MAX_SENDS_PER_WINDOW) {
    logger.warn("OTP send limit exceeded");
    throw new TooManyRequestsError(
      "Too many verification codes requested. Please try again in an hour.",
      "OTP_SEND_LIMIT",
    );
  }
};

const issueChallenge = async (email: string, data: SignupData): Promise<void> => {
  const otp = generateOtp();
  const otpHash = await hashPassword(otp);
  const key = redisKeys.pendingSignup(email);

  await redisClient.set(key, JSON.stringify({ ...data, otpHash }), "EX", OTP_TTL_SECONDS);
  await redisClient.del(redisKeys.otpAttempts(email));

  try {
    await sendOtpEmail(email, data.firstName, otp);
  } catch (error) {
    // Don't leave a pending sign-up whose code was never delivered.
    await redisClient.del(key);
    throw error;
  }
};

/** Starts sign-up: stores pending data and emails a one-time code. */
export const startSignup = async (email: string, data: SignupData): Promise<void> => {
  await enforceOtpSendLimit(email);
  await issueChallenge(email, data);
};

/** Re-sends a code for an existing pending sign-up. Silent if none exists. */
export const resendSignupOtp = async (email: string): Promise<void> => {
  await enforceOtpSendLimit(email);
  const raw = await redisClient.get(redisKeys.pendingSignup(email));
  if (!raw) return;
  const pending = pendingSignupSchema.parse(JSON.parse(raw));
  await issueChallenge(email, {
    firstName: pending.firstName,
    lastName: pending.lastName,
    passwordHash: pending.passwordHash,
  });
};

/** Verifies the code and returns (and consumes) the pending sign-up data. */
export const consumeSignup = async (
  email: string,
  otp: string,
): Promise<SignupData> => {
  const key = redisKeys.pendingSignup(email);
  const attemptsKey = redisKeys.otpAttempts(email);

  const raw = await redisClient.get(key);
  if (!raw) {
    throw new UnauthorizedError("Code is invalid or has expired.", "INVALID_OTP");
  }

  const attempts = await redisClient.incr(attemptsKey);
  if (attempts === 1) await redisClient.expire(attemptsKey, OTP_TTL_SECONDS);

  if (attempts > MAX_VERIFY_ATTEMPTS) {
    await redisClient.del(key, attemptsKey);
    throw new TooManyRequestsError(
      "Too many incorrect attempts. Please request a new code.",
      "OTP_ATTEMPTS_EXCEEDED",
    );
  }

  const pending = pendingSignupSchema.parse(JSON.parse(raw));
  if (!(await comparePassword(otp, pending.otpHash))) {
    throw new UnauthorizedError("Code is invalid or has expired.", "INVALID_OTP");
  }

  await redisClient.del(key, attemptsKey);
  return {
    firstName: pending.firstName,
    lastName: pending.lastName,
    passwordHash: pending.passwordHash,
  };
};
