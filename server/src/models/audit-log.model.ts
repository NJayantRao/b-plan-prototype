import mongoose, { Schema, type Model, type Types } from "mongoose";

export const AUDIT_OUTCOMES = ["success", "failure", "denied"] as const;
export type AuditOutcome = (typeof AUDIT_OUTCOMES)[number];

export interface AuditLogEntity {
  _id: Types.ObjectId;
  actorId?: Types.ObjectId;
  actorRole?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  outcome: AuditOutcome;
  ip?: string;
  userAgent?: string;
  /** Small, non-clinical context only. Never store PHI, secrets, or emails. */
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

const auditLogSchema = new Schema<AuditLogEntity>(
  {
    actorId: { type: Schema.Types.ObjectId, ref: "User" },
    actorRole: { type: String },
    action: { type: String, required: true, index: true },
    resourceType: { type: String, required: true },
    resourceId: { type: String },
    outcome: { type: String, enum: AUDIT_OUTCOMES, required: true },
    ip: { type: String },
    userAgent: { type: String, maxlength: 300 },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

auditLogSchema.index({ actorId: 1, createdAt: -1 });
auditLogSchema.index({ createdAt: -1 });

// Audit logs are append-only: block updates and deletes at the model level.
auditLogSchema.pre(/^(update|delete|replace|findOneAnd)/, async function () {
  throw new Error("Audit logs are immutable");
});

export const AuditLog: Model<AuditLogEntity> =
  (mongoose.models["AuditLog"] as Model<AuditLogEntity> | undefined) ??
  mongoose.model<AuditLogEntity>("AuditLog", auditLogSchema);
