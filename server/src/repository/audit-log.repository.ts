import type { QueryFilter } from "mongoose";
import { AuditLog, type AuditLogEntity } from "../models/audit-log.model.js";

export const createAuditLog = async (
  data: Omit<AuditLogEntity, "_id" | "createdAt">,
): Promise<void> => {
  await AuditLog.create(data);
};

export interface AuditLogFilter {
  action?: string | undefined;
  actorId?: string | undefined;
  outcome?: AuditLogEntity["outcome"] | undefined;
}

export const listAuditLogs = async (
  filters: AuditLogFilter,
  page: number,
  limit: number,
) => {
  const query: QueryFilter<AuditLogEntity> = {};
  if (filters.action) query.action = filters.action;
  if (filters.actorId) query.actorId = filters.actorId;
  if (filters.outcome) query.outcome = filters.outcome;

  const [items, total] = await Promise.all([
    AuditLog.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean<AuditLogEntity[]>()
      .exec(),
    AuditLog.countDocuments(query).exec(),
  ]);
  return { items, total };
};
