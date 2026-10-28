import mongoose, { Schema, type Model, type Types } from "mongoose";

export interface ResponderProfileEntity {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  authorized: boolean;
  authorizedBy?: Types.ObjectId;
  authorizedAt?: Date;
  serviceArea?: { city: string; state: string };
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<ResponderProfileEntity>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    authorized: { type: Boolean, required: true, default: false, index: true },
    authorizedBy: { type: Schema.Types.ObjectId, ref: "User" },
    authorizedAt: { type: Date },
    serviceArea: {
      type: new Schema(
        {
          city: { type: String, trim: true, maxlength: 100 },
          state: { type: String, trim: true, maxlength: 100 },
        },
        { _id: false },
      ),
    },
  },
  { timestamps: true },
);

export const ResponderProfile: Model<ResponderProfileEntity> =
  (mongoose.models["ResponderProfile"] as Model<ResponderProfileEntity> | undefined) ??
  mongoose.model<ResponderProfileEntity>("ResponderProfile", schema);
