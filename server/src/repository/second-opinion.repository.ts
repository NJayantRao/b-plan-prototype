import type { Types } from "mongoose";
import {
  SecondOpinionRequest,
  type SecondOpinionRequestEntity,
} from "../models/second-opinion-request.model.js";

type Id = string | Types.ObjectId;

export type NewSecondOpinion = Pick<
  SecondOpinionRequestEntity,
  "assessmentId" | "patientId" | "requestedBy" | "requestedByRole"
> & { reason?: string | undefined };

export const createSecondOpinion = async (
  data: NewSecondOpinion,
): Promise<SecondOpinionRequestEntity> => {
  const { reason, ...rest } = data;
  const doc = await SecondOpinionRequest.create({
    ...rest,
    ...(reason ? { reason } : {}),
    status: "requested",
  });
  return doc.toObject() as SecondOpinionRequestEntity;
};

export const findSecondOpinionById = (id: Id) =>
  SecondOpinionRequest.findById(id).lean<SecondOpinionRequestEntity>().exec();

export const findSecondOpinionByAssessment = (assessmentId: Id) =>
  SecondOpinionRequest.findOne({ assessmentId }).lean<SecondOpinionRequestEntity>().exec();

export const findSecondOpinionsByAssessmentIds = (ids: Types.ObjectId[]) =>
  SecondOpinionRequest.find({ assessmentId: { $in: ids } })
    .lean<SecondOpinionRequestEntity[]>()
    .exec();

/** Atomic: only one doctor can take a requested second opinion. */
export const claimSecondOpinion = (id: Id, doctorId: Id) =>
  SecondOpinionRequest.findOneAndUpdate(
    { _id: id, status: "requested" },
    { $set: { status: "assigned", assignedDoctorId: doctorId, assignedAt: new Date() } },
    { returnDocument: "after" },
  )
    .lean<SecondOpinionRequestEntity>()
    .exec();

export const completeSecondOpinion = (
  id: Id,
  data: {
    reviewId: Id;
    finalOutcome: NonNullable<SecondOpinionRequestEntity["finalOutcome"]>;
  },
) =>
  SecondOpinionRequest.findOneAndUpdate(
    { _id: id, status: "assigned" },
    { $set: { status: "completed", reviewId: data.reviewId, finalOutcome: data.finalOutcome } },
    { returnDocument: "after" },
  )
    .lean<SecondOpinionRequestEntity>()
    .exec();

const paged = async (
  filter: Record<string, unknown>,
  sort: Record<string, 1 | -1>,
  page: number,
  limit: number,
) => {
  const [items, total] = await Promise.all([
    SecondOpinionRequest.find(filter)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean<SecondOpinionRequestEntity[]>()
      .exec(),
    SecondOpinionRequest.countDocuments(filter).exec(),
  ]);
  return { items, total };
};

export const listSecondOpinionsForPatient = (patientId: Id, page: number, limit: number) =>
  paged({ patientId }, { createdAt: -1 }, page, limit);

/** Open requests a doctor may claim (never for cases they reviewed first). */
export const listAvailableSecondOpinions = (
  excludeAssessmentIds: Types.ObjectId[],
  page: number,
  limit: number,
) =>
  paged(
    { status: "requested", assessmentId: { $nin: excludeAssessmentIds } },
    { createdAt: 1 },
    page,
    limit,
  );

export const listSecondOpinionsAssignedTo = (doctorId: Id, page: number, limit: number) =>
  paged({ assignedDoctorId: doctorId }, { updatedAt: -1 }, page, limit);

export const findAssignedAssessmentIds = async (doctorId: Id) => {
  const rows = await SecondOpinionRequest.find({ assignedDoctorId: doctorId })
    .select("assessmentId")
    .lean<{ assessmentId: Types.ObjectId }[]>()
    .exec();
  return rows.map((r) => r.assessmentId);
};

export const doctorIsSecondOpinionFor = async (doctorId: Id, patientId: Id): Promise<boolean> =>
  (await SecondOpinionRequest.exists({ assignedDoctorId: doctorId, patientId })) !== null;

/** Keeps the request's outcome copy in step with an amended review. */
export const setFinalOutcome = (
  id: Id,
  finalOutcome: NonNullable<SecondOpinionRequestEntity["finalOutcome"]>,
) =>
  SecondOpinionRequest.findOneAndUpdate(
    { _id: id, status: "completed" },
    { $set: { finalOutcome } },
    { returnDocument: "after" },
  )
    .lean<SecondOpinionRequestEntity>()
    .exec();
