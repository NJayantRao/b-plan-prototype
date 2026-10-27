import mongoose from "mongoose";
import { ENV } from "../config/env.js";
import { redisClient } from "../config/redis.js";

type MongoState = "connected" | "connecting" | "disconnecting" | "disconnected";

const MONGO_STATES: Record<number, MongoState> = {
  0: "disconnected",
  1: "connected",
  2: "connecting",
  3: "disconnecting",
};

export interface HealthReport {
  status: "ok" | "degraded";
  environment: string;
  uptimeSeconds: number;
  timestamp: string;
  services: {
    mongodb: MongoState;
    redis: string;
  };
}

export const getHealthReport = (): HealthReport => {
  const mongodb = MONGO_STATES[mongoose.connection.readyState] ?? "disconnected";
  const redis = redisClient.status;

  const healthy = mongodb === "connected" && redis === "ready";

  return {
    status: healthy ? "ok" : "degraded",
    environment: ENV.NODE_ENV,
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
    services: { mongodb, redis },
  };
};
