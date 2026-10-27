import morgan from "morgan";
import logger from "../config/logger.js";

// Method, path (no query string, to avoid logging tokens/PII), status, time.
morgan.token("path", (req) => (req.url ?? "").split("?")[0] ?? "");

const morganMiddleware = morgan(
  ":method :path :status :response-time ms",
  {
    stream: {
      write: (message: string) => {
        logger.http(message.trim());
      },
    },
  },
);

export default morganMiddleware;
