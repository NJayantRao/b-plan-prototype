import cors from "cors";
import { ENV } from "../config/env.js";

const corsMiddleware = cors({
  origin: ENV.allowedOrigins,
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Origin", "Authorization"],
});

export default corsMiddleware;
