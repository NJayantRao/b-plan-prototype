import type { Server } from "node:http";
import app from "./app.js";
import connectToDB, { disconnectFromDB } from "./config/db.js";
import { ENV } from "./config/env.js";
import logger from "./config/logger.js";
import { connectToRedis, disconnectFromRedis } from "./config/redis.js";

let server: Server | undefined;
let shuttingDown = false;

const shutdown = async (signal: string, exitCode = 0): Promise<void> => {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info(`${signal} received, shutting down gracefully...`);

  // Force exit if cleanup hangs.
  const forceExit = setTimeout(() => {
    logger.error("Graceful shutdown timed out, forcing exit");
    process.exit(1);
  }, 10_000);
  forceExit.unref();

  try {
    if (server) {
      await new Promise<void>((resolve, reject) => {
        server?.close((err) => (err ? reject(err) : resolve()));
      });
    }
    await disconnectFromDB();
    await disconnectFromRedis();
    logger.info("Shutdown complete");
    process.exit(exitCode);
  } catch (error) {
    logger.error(
      `Error during shutdown: ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exit(1);
  }
};

const startServer = async (): Promise<void> => {
  await connectToDB();
  await connectToRedis();

  server = app.listen(ENV.PORT, () => {
    logger.info(`Magadh Ventures API listening on port ${ENV.PORT} (${ENV.NODE_ENV})`);
  });
};

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("unhandledRejection", (reason) => {
  logger.error(`Unhandled rejection: ${String(reason)}`);
});

startServer().catch((error: unknown) => {
  logger.error(
    `Failed to start server: ${error instanceof Error ? error.message : String(error)}`,
  );
  void shutdown("STARTUP_FAILURE", 1);
});
