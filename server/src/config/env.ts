import dotenv from "dotenv";
import { z } from "zod";

dotenv.config({ quiet: true });

const booleanFromString = z
  .enum(["true", "false"])
  .default("false")
  .transform((value) => value === "true");

/** Treats an empty string (e.g. `RESEND_API_KEY=`) as "not set". */
const optionalString = z
  .string()
  .optional()
  .transform((value) => value?.trim() || undefined);

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(5000),
  CLIENT_URL: z.string().min(1).default("http://localhost:3000"),
  LOG_LEVEL: z
    .enum(["error", "warn", "info", "http", "debug"])
    .default("info"),
  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL is required (MongoDB connection string)"),
  REDIS_URL: z.string().min(1).default("redis://localhost:6379"),
  REDIS_TLS: booleanFromString,
  ACCESS_TOKEN_SECRET: z
    .string()
    .min(32, "ACCESS_TOKEN_SECRET must be at least 32 characters"),
  REFRESH_TOKEN_SECRET: z
    .string()
    .min(32, "REFRESH_TOKEN_SECRET must be at least 32 characters"),
  // "none" is required when the frontend and API are on different sites
  // (e.g. Vercel + a separate API host); it forces Secure cookies.
  COOKIE_SAME_SITE: z.enum(["lax", "strict", "none"]).default("lax"),
  COOKIE_DOMAIN: optionalString,
  // Email delivery is optional: without a key, emails are simulated.
  RESEND_API_KEY: optionalString,
  MAIL_FROM: z.string().min(1).default("Magadh Ventures <onboarding@resend.dev>"),
}).refine((env) => env.ACCESS_TOKEN_SECRET !== env.REFRESH_TOKEN_SECRET, {
  message: "ACCESS_TOKEN_SECRET and REFRESH_TOKEN_SECRET must be different",
  path: ["REFRESH_TOKEN_SECRET"],
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // Logger is not available yet (it depends on ENV), so report directly.
  console.error("❌ Invalid environment configuration:");
  for (const issue of parsed.error.issues) {
    console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
  }
  process.exit(1);
}

export const ENV = {
  ...parsed.data,
  isProduction: parsed.data.NODE_ENV === "production",
  isTest: parsed.data.NODE_ENV === "test",
  /** Cookies must be Secure in production or when SameSite=None. */
  cookieSecure:
    parsed.data.NODE_ENV === "production" ||
    parsed.data.COOKIE_SAME_SITE === "none",
  /** Allowed CORS origins, parsed from the comma-separated CLIENT_URL. */
  allowedOrigins: parsed.data.CLIENT_URL.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
} as const;
