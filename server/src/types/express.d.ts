import type { Role } from "../constants/roles.js";

declare global {
  namespace Express {
    interface Request {
      /** Set by the `authenticate` middleware from the verified access token + DB. */
      auth?: { userId: string; role: Role };
    }
  }
}

export {};
