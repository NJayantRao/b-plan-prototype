import type { Types } from "mongoose";
import { User } from "../models/user.model.js";
import { ResponderProfile, type ResponderProfileEntity } from "../models/responder-profile.model.js";

type Id = string | Types.ObjectId;

export const findResponderProfile = (userId: Id) =>
  ResponderProfile.findOne({ userId }).lean<ResponderProfileEntity>().exec();

export const setResponderAuthorization = async (
  userId: Id,
  authorized: boolean,
  adminId: Id,
) =>
  ResponderProfile.findOneAndUpdate(
    { userId },
    {
      $set: authorized
        ? { authorized: true, authorizedBy: adminId, authorizedAt: new Date() }
        : { authorized: false },
      ...(!authorized ? { $unset: { authorizedBy: "", authorizedAt: "" } } : {}),
      $setOnInsert: { userId },
    },
    { upsert: true, returnDocument: "after", runValidators: true },
  )
    .lean<ResponderProfileEntity>()
    .exec();

export const countAuthorizedResponders = () =>
  ResponderProfile.countDocuments({ authorized: true }).exec();

export const listResponderDirectory = async (page: number, limit: number) => {
  const filter = { role: "responder" as const };
  const [users, total] = await Promise.all([
    User.find(filter)
      .select("firstName lastName email status createdAt")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean()
      .exec(),
    User.countDocuments(filter).exec(),
  ]);
  const profiles = await ResponderProfile.find({
    userId: { $in: users.map((user) => user._id) },
  })
    .select("userId authorized authorizedAt")
    .lean<Pick<ResponderProfileEntity, "userId" | "authorized" | "authorizedAt">[]>()
    .exec();
  const profileByUserId = new Map(profiles.map((profile) => [String(profile.userId), profile]));
  return {
    items: users.map((user) => {
      const profile = profileByUserId.get(String(user._id));
      return {
        userId: String(user._id),
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        status: user.status,
        authorized: profile?.authorized ?? false,
        authorizedAt: profile?.authorizedAt ?? null,
      };
    }),
    total,
  };
};
