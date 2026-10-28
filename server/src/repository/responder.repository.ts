import type { Types } from "mongoose";
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
