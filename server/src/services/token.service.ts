import type { Types } from "mongoose";
import logger from "../config/logger.js";
import { redisClient } from "../config/redis.js";
import type { Role } from "../constants/roles.js";
import { findAuthUserById } from "../repository/user.repository.js";
import { UnauthorizedError } from "../utils/api-error.js";
import { generateTokenId } from "../utils/crypto.js";
import {
  REFRESH_TOKEN_TTL_SECONDS,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "../utils/jwt.js";
import { redisKeys } from "../utils/redis-keys.js";

export interface SessionTokens {
  accessToken: string;
  refreshToken: string;
}

/**
 * Creates a new session. Each refresh token has a unique id (jti) stored in
 * Redis, so devices have independent sessions and tokens can be revoked.
 */
export const issueSession = async (user: {
  _id: Types.ObjectId;
  role: Role;
}): Promise<SessionTokens> => {
  const userId = String(user._id);
  const jti = generateTokenId();

  await redisClient.set(
    redisKeys.refreshSession(userId, jti),
    "1",
    "EX",
    REFRESH_TOKEN_TTL_SECONDS,
  );
  const sessionsKey = redisKeys.userSessions(userId);
  await redisClient.sadd(sessionsKey, jti);
  await redisClient.expire(sessionsKey, REFRESH_TOKEN_TTL_SECONDS);

  return {
    accessToken: signAccessToken({ sub: userId, role: user.role }),
    refreshToken: signRefreshToken({ sub: userId, jti }),
  };
};

export const revokeAllSessions = async (userId: string): Promise<void> => {
  const sessionsKey = redisKeys.userSessions(userId);
  const jtis = await redisClient.smembers(sessionsKey);
  const keys = jtis.map((jti) => redisKeys.refreshSession(userId, jti));
  if (keys.length > 0) await redisClient.del(...keys);
  await redisClient.del(sessionsKey);
};

/** Rotates a refresh token. Reuse of an old token revokes every session. */
export const rotateSession = async (
  refreshToken: string,
): Promise<{ tokens: SessionTokens; userId: string }> => {
  const { sub, jti } = verifyRefreshToken(refreshToken);

  // DEL is atomic: only one request can consume a given refresh token.
  const removed = await redisClient.del(redisKeys.refreshSession(sub, jti));
  if (removed === 0) {
    logger.warn(`Refresh token reuse detected; revoking all sessions for user ${sub}`);
    await revokeAllSessions(sub);
    throw new UnauthorizedError("Session expired. Please sign in again.", "SESSION_REVOKED");
  }
  await redisClient.srem(redisKeys.userSessions(sub), jti);

  const user = await findAuthUserById(sub);
  if (!user || user.status !== "active") {
    throw new UnauthorizedError("Session expired. Please sign in again.", "SESSION_REVOKED");
  }

  return { tokens: await issueSession(user), userId: sub };
};

/** Logout: best-effort revocation of the presented refresh token. */
export const revokeSession = async (
  refreshToken: string | undefined,
): Promise<string | undefined> => {
  if (!refreshToken) return undefined;
  try {
    const { sub, jti } = verifyRefreshToken(refreshToken);
    await redisClient.del(redisKeys.refreshSession(sub, jti));
    await redisClient.srem(redisKeys.userSessions(sub), jti);
    return sub;
  } catch {
    // An invalid/expired token has nothing left to revoke.
    return undefined;
  }
};
