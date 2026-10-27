import type { Types } from "mongoose";
import type { AccountStatus, Role } from "../constants/roles.js";
import { User, type UserEntity } from "../models/user.model.js";

export interface CreateUserData {
  firstName: string;
  lastName: string;
  email: string;
  passwordHash: string;
  role: Role;
  status?: AccountStatus;
  emailVerified: boolean;
}

export const findUserByEmail = (email: string) =>
  User.findOne({ email }).lean<UserEntity>().exec();

/** Includes the password hash. Only use for credential checks. */
export const findUserByEmailWithPassword = (email: string) =>
  User.findOne({ email }).select("+passwordHash").lean<UserEntity>().exec();

export const findUserById = (id: string | Types.ObjectId) =>
  User.findById(id).lean<UserEntity>().exec();

/** Minimal projection used on every authenticated request. */
export const findAuthUserById = (id: string) =>
  User.findById(id)
    .select("role status")
    .lean<Pick<UserEntity, "_id" | "role" | "status">>()
    .exec();

export const findUsersByIds = (ids: Types.ObjectId[]) =>
  User.find({ _id: { $in: ids } }).lean<UserEntity[]>().exec();

export const createUser = async (data: CreateUserData): Promise<UserEntity> => {
  const doc = await User.create(data);
  // Re-read without the password hash so it never travels further.
  const user = await findUserById(doc._id);
  if (!user) throw new Error("User not found after creation");
  return user;
};

export const touchLastLogin = async (id: Types.ObjectId): Promise<void> => {
  await User.updateOne({ _id: id }, { $set: { lastLoginAt: new Date() } });
};
