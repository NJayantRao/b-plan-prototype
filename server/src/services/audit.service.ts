import type { Request } from "express";
import { Types } from "mongoose";
import logger from "../config/logger.js";
import type { AuditOutcome } from "../models/audit-log.model.js";
import { createAuditLog } from "../repository/audit-log.repository.js";

export interface RequestContext {
  ip?: string | undefined;
  userAgent?: string | undefined;
}

export const getRequestContext = (req: Request): RequestContext => ({
  ip: req.ip,
  userAgent: req.get("user-agent")?.slice(0, 300),
});

export interface AuditEntry {
  actor?: { userId: string; role: string } | undefined;
  action: string;
  resourceType: string;
  resourceId?: string | undefined;
  outcome: AuditOutcome;
  /** Small, non-clinical context only: never PHI, secrets, or emails. */
  metadata?: Record<string, unknown> | undefined;
}

/**
 * Records an audit event. Best-effort by design: a failure to write the audit
 * trail is logged loudly but never breaks the user's request.
 */
export const recordAudit = async (
  entry: AuditEntry,
  ctx: RequestContext = {},
): Promise<void> => {
  try {
    await createAuditLog({
      ...(entry.actor && Types.ObjectId.isValid(entry.actor.userId)
        ? {
            actorId: new Types.ObjectId(entry.actor.userId),
            actorRole: entry.actor.role,
          }
        : {}),
      action: entry.action,
      resourceType: entry.resourceType,
      ...(entry.resourceId ? { resourceId: entry.resourceId } : {}),
      outcome: entry.outcome,
      ...(ctx.ip ? { ip: ctx.ip } : {}),
      ...(ctx.userAgent ? { userAgent: ctx.userAgent } : {}),
      ...(entry.metadata ? { metadata: entry.metadata } : {}),
    });
  } catch (error) {
    logger.error(
      `AUDIT WRITE FAILED for action=${entry.action}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
};
