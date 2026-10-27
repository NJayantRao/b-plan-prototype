import { hashForKey } from "./crypto.js";

export const redisKeys = {
  // Pending sign-up (profile data + hashed OTP). The user row is only created
  // once the OTP is verified, so unverified accounts never exist in MongoDB.
  pendingSignup: (email: string) => `signup:${hashForKey(email)}`,
  otpSendCount: (email: string) => `otp-send-count:${hashForKey(email)}`,
  otpAttempts: (email: string) => `otp-attempts:${hashForKey(email)}`,
  loginFailures: (email: string) => `login-failures:${hashForKey(email)}`,
  refreshSession: (userId: string, jti: string) => `refresh:${userId}:${jti}`,
  userSessions: (userId: string) => `sessions:${userId}`,
};
