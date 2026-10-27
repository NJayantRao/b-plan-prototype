import { Redis } from "ioredis";
import { ENV } from "./env.js";
import logger from "./logger.js";

const MAX_STARTUP_RETRIES = 3;
let hasConnectedOnce = false;

const client = new Redis(ENV.REDIS_URL, {
  // Connect explicitly in connectToRedis() so startup can fail fast.
  lazyConnect: true,
  maxRetriesPerRequest: 2,
  // Managed Redis (e.g. Upstash) needs TLS. Controlled by REDIS_TLS.
  ...(ENV.REDIS_TLS ? { tls: {} } : {}),
  // Give up quickly if Redis is unreachable at startup, but once we have
  // connected, keep retrying forever so transient outages recover.
  retryStrategy: (attempt) => {
    if (!hasConnectedOnce && attempt > MAX_STARTUP_RETRIES) return null;
    return Math.min(attempt * 200, 2_000);
  },
});

client.on("ready", () => {
  hasConnectedOnce = true;
  logger.info("✅ Redis connected");
});
client.on("reconnecting", () => logger.warn("Reconnecting to Redis..."));
client.on("end", () => logger.warn("❌ Redis connection ended"));
client.on("error", (error: Error) =>
  logger.error(`❌ Redis error: ${error.message}`),
);

/** Connects to Redis; rejects if it cannot be reached at startup. */
const connectToRedis = async (): Promise<void> => {
  try {
    await client.connect();
    await client.ping();
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    // The URL is deliberately omitted: it may contain credentials.
    throw new Error(
      `Unable to connect to Redis (${reason}). Check REDIS_URL, REDIS_TLS, and that Redis is running.`,
    );
  }
};

const disconnectFromRedis = async (): Promise<void> => {
  if (client.status === "end") return;
  await client.quit();
};

export { client as redisClient, connectToRedis, disconnectFromRedis };
