import type { QueryFilter, Types } from "mongoose";
import type { AiStatus } from "../constants/clinical.js";
import { Assessment, type AssessmentEntity } from "../models/assessment.model.js";

export type NewAssessment = Omit<
  AssessmentEntity,
  "_id" | "createdAt" | "updatedAt" | "assignedDoctorId" | "claimedAt" | "completedAt"
>;

type Id = string | Types.ObjectId;

export const createAssessment = async (data: NewAssessment): Promise<AssessmentEntity> => {
  const doc = await Assessment.create(data);
  return doc.toObject() as AssessmentEntity;
};

export const findAssessmentById = (id: Id) =>
  Assessment.findById(id).lean<AssessmentEntity>().exec();

export const findAssessmentsByIds = (ids: Types.ObjectId[]) =>
  Assessment.find({ _id: { $in: ids } }).lean<AssessmentEntity[]>().exec();

const paged = async (
  filter: QueryFilter<AssessmentEntity>,
  sort: Record<string, 1 | -1>,
  page: number,
  limit: number,
) => {
  const [items, total] = await Promise.all([
    Assessment.find(filter)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean<AssessmentEntity[]>()
      .exec(),
    Assessment.countDocuments(filter).exec(),
  ]);
  return { items, total };
};

export const listAssessmentsForPatient = (patientId: Id, page: number, limit: number) =>
  paged({ patientId }, { createdAt: -1 }, page, limit);

/** Unclaimed cases awaiting a first review: most urgent first, then oldest. */
export const listReviewQueue = (page: number, limit: number) =>
  paged(
    { status: "awaiting_review", assignedDoctorId: { $exists: false } },
    { priorityRank: 1, createdAt: 1 },
    page,
    limit,
  );

/** Cases a doctor owns as primary reviewer or as assigned second-opinion doctor. */
export const listAssessmentsForDoctor = (
  doctorId: Id,
  secondOpinionAssessmentIds: Types.ObjectId[],
  page: number,
  limit: number,
) =>
  paged(
    { $or: [{ assignedDoctorId: doctorId }, { _id: { $in: secondOpinionAssessmentIds } }] },
    { updatedAt: -1 },
    page,
    limit,
  );

export const findPrimaryAssessmentIdsForDoctor = async (doctorId: Id) => {
  const rows = await Assessment.find({ assignedDoctorId: doctorId })
    .select("_id")
    .lean<{ _id: Types.ObjectId }[]>()
    .exec();
  return rows.map((r) => r._id);
};

export const doctorIsPrimaryFor = async (doctorId: Id, patientId: Id): Promise<boolean> =>
  (await Assessment.exists({ assignedDoctorId: doctorId, patientId })) !== null;

/** Atomic: only one doctor can win the claim. */
export const claimAssessment = (id: Id, doctorId: Id) =>
  Assessment.findOneAndUpdate(
    { _id: id, status: "awaiting_review", assignedDoctorId: { $exists: false } },
    { $set: { assignedDoctorId: doctorId, status: "in_review", claimedAt: new Date() } },
    { returnDocument: "after" },
  )
    .lean<AssessmentEntity>()
    .exec();

export interface AiUpdate {
  status: AiStatus;
  mode?: string | undefined;
  model?: string | undefined;
  generatedAt?: Date | undefined;
  result?: Record<string, unknown> | undefined;
  error?: { code: string; message: string } | undefined;
  note?: string | undefined;
}

export const writeAiOutcome = (id: Id, ai: AiUpdate) => {
  const $set: Record<string, unknown> = { "ai.status": ai.status };
  const $unset: Record<string, ""> = {};
  for (const key of ["mode", "model", "generatedAt", "result", "error", "note"] as const) {
    if (ai[key] !== undefined) $set[`ai.${key}`] = ai[key];
    else $unset[`ai.${key}`] = "";
  }
  return Assessment.findOneAndUpdate(
    { _id: id },
    { $set, $unset },
    { returnDocument: "after" },
  )
    .lean<AssessmentEntity>()
    .exec();
};

/** Atomic lock for an AI retry: only one retry can start, and only while allowed. */
export const beginAiRetry = (id: Id, maxAttempts: number) =>
  Assessment.findOneAndUpdate(
    {
      _id: id,
      "ai.status": "unavailable",
      "ai.attempts": { $lt: maxAttempts },
      status: { $in: ["awaiting_review", "in_review"] },
      "redFlags.level": { $ne: "emergency" },
    },
    { $set: { "ai.status": "pending" }, $inc: { "ai.attempts": 1 } },
    { returnDocument: "after" },
  )
    .lean<AssessmentEntity>()
    .exec();

export const transitionAssessment = (
  id: Id,
  from: AssessmentEntity["status"],
  to: AssessmentEntity["status"],
  extra: Record<string, unknown> = {},
) =>
  Assessment.findOneAndUpdate(
    { _id: id, status: from },
    { $set: { status: to, ...extra } },
    { returnDocument: "after" },
  )
    .lean<AssessmentEntity>()
    .exec();
