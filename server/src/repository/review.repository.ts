import type { Types, UpdateQuery } from "mongoose";
import {
  AssessmentReview,
  type AssessmentReviewEntity,
} from "../models/assessment-review.model.js";

type Id = string | Types.ObjectId;

export type NewReview = Omit<
  AssessmentReviewEntity,
  "_id" | "createdAt" | "updatedAt" | "revisions"
>;

export const createReview = async (data: NewReview): Promise<AssessmentReviewEntity> => {
  const doc = await AssessmentReview.create({ ...data, revisions: [] });
  return doc.toObject() as AssessmentReviewEntity;
};

export const findReviewById = (id: Id) =>
  AssessmentReview.findById(id).lean<AssessmentReviewEntity>().exec();

export const findReviewsByAssessment = (assessmentId: Id) =>
  AssessmentReview.find({ assessmentId })
    .sort({ submittedAt: 1 })
    .lean<AssessmentReviewEntity[]>()
    .exec();

export const findReviewsByAssessmentIds = (ids: Types.ObjectId[]) =>
  AssessmentReview.find({ assessmentId: { $in: ids } })
    .sort({ submittedAt: 1 })
    .lean<AssessmentReviewEntity[]>()
    .exec();

export const updateReview = (id: Id, update: UpdateQuery<AssessmentReviewEntity>) =>
  AssessmentReview.findOneAndUpdate({ _id: id }, update, {
    returnDocument: "after",
    runValidators: true,
  })
    .lean<AssessmentReviewEntity>()
    .exec();
