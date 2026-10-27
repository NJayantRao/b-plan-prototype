import mongoose, { Schema, type Model, type Types } from "mongoose";
import {
  ACCOUNT_STATUSES,
  ROLES,
  type AccountStatus,
  type Role,
} from "../constants/roles.js";

export interface UserEntity {
  _id: Types.ObjectId;
  firstName: string;
  lastName: string;
  email: string;
  /** Excluded from queries unless explicitly selected with `+passwordHash`. */
  passwordHash?: string;
  role: Role;
  status: AccountStatus;
  emailVerified: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<UserEntity>(
  {
    firstName: { type: String, required: true, trim: true, maxlength: 50 },
    lastName: { type: String, required: true, trim: true, maxlength: 50 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
    },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ROLES, required: true, default: "patient", index: true },
    status: { type: String, enum: ACCOUNT_STATUSES, required: true, default: "active" },
    emailVerified: { type: Boolean, required: true, default: false },
    lastLoginAt: { type: Date },
  },
  { timestamps: true },
);

export const User: Model<UserEntity> =
  (mongoose.models["User"] as Model<UserEntity> | undefined) ??
  mongoose.model<UserEntity>("User", userSchema);
