import { createLogger, format, transports } from "winston";
import { ENV } from "./env.js";

const { combine, timestamp, colorize, printf, json, errors } = format;

const consoleFormat = combine(
  colorize(),
  timestamp(),
  printf(({ level, message, timestamp: time, stack }) => {
    return `[${String(time)}] ${level}: ${String(stack ?? message)}`;
  }),
);

const logger = createLogger({
  level: ENV.LOG_LEVEL,
  format: combine(errors({ stack: true }), timestamp(), json()),
  transports: [
    new transports.Console({
      format: ENV.isProduction ? combine(timestamp(), json()) : consoleFormat,
    }),
  ],
});

export default logger;
