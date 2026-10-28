import { z } from "zod";
import { paginationSchema } from "../utils/pagination.js";

export const requestSecondOpinionSchema = z
  .object({ reason: z.string().trim().min(1).max(1000).optional() })
  .strict();

export const listSecondOpinionsQuerySchema = paginationSchema.extend({
  /** Doctors only. "available" = open requests; "mine" = assigned to me. */
  scope: z.enum(["available", "mine"]).optional(),
});
