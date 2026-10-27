import mongoose from "mongoose";
import { z } from "zod";

export const objectIdSchema = z
  .string()
  .refine((value) => mongoose.isValidObjectId(value) && /^[a-f\d]{24}$/i.test(value), {
    message: "Invalid id",
  });

export const idParamSchema = z.object({ id: objectIdSchema });

const trimmed = (max: number) => z.string().trim().min(1).max(max);
export const shortText = trimmed;
