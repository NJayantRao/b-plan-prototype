import { createHash, randomInt, randomUUID } from "node:crypto";

/** Short stable hash so emails never appear in Redis keys. */
export const hashForKey = (value: string): string =>
  createHash("sha256").update(value).digest("hex").slice(0, 32);

export const generateOtp = (): string =>
  randomInt(100_000, 1_000_000).toString();

export const generateTokenId = (): string => randomUUID();
