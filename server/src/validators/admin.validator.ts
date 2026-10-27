import { z } from "zod";
import { VERIFICATION_STATUSES } from "../constants/roles.js";
import { AUDIT_OUTCOMES } from "../models/audit-log.model.js";
import { paginationSchema } from "../utils/pagination.js";
import { objectIdSchema } from "./common.validator.js";

export const listDoctorsQuerySchema = paginationSchema.extend({
  status: z.enum(VERIFICATION_STATUSES).optional(),
});

export const setVerificationSchema = z
  .object({
    status: z.enum(VERIFICATION_STATUSES),
    notes: z.string().trim().max(500).optional(),
  })
  .strict();

export const listAuditLogsQuerySchema = paginationSchema.extend({
  action: z.string().trim().max(100).optional(),
  actorId: objectIdSchema.optional(),
  outcome: z.enum(AUDIT_OUTCOMES).optional(),
});
