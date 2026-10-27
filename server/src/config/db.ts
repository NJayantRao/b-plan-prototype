import mongoose from "mongoose";
import { ENV } from "./env.js";
import logger from "./logger.js";

let listenersAttached = false;

const attachListeners = () => {
  if (listenersAttached) return;
  listenersAttached = true;

  const db = mongoose.connection;

  db.on("connected", () => logger.info("✅ MongoDB connected"));
  db.on("disconnected", () => logger.warn("❌ MongoDB disconnected"));
  db.on("reconnected", () => logger.info("MongoDB reconnected"));
  db.on("error", (error: Error) =>
    logger.error(`❌ MongoDB error: ${error.message}`),
  );
};

/**
 * Connects to MongoDB and resolves only once the connection is established.
 * Rejects if the server cannot be reached, so the caller can fail fast.
 */
const connectToDB = async (): Promise<void> => {
  attachListeners();

  await mongoose.connect(ENV.DATABASE_URL, {
    serverSelectionTimeoutMS: 10_000,
  });
};

const disconnectFromDB = async (): Promise<void> => {
  await mongoose.disconnect();
};

export { connectToDB, disconnectFromDB };
export default connectToDB;
