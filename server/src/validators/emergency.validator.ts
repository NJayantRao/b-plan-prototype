import { z } from "zod";
import { EMERGENCY_STATUSES, EMERGENCY_URGENCIES } from "../constants/supporting.js";
import { paginationSchema } from "../utils/pagination.js";
import { objectIdSchema } from "./common.validator.js";

export const createEmergencySchema = z
  .object({
    location: z
      .object({
        city: z.string().trim().min(1).max(100),
        state: z.string().trim().min(1).max(100),
        address: z.string().trim().min(1).max(300).optional(),
      })
      .strict(),
    urgency: z.enum(EMERGENCY_URGENCIES),
    description: z.string().trim().min(1).max(1000),
  })
  .strict();

export const listEmergenciesQuerySchema = paginationSchema.extend({
  status: z.enum(EMERGENCY_STATUSES).optional(),
});

export const emergencyIdParamSchema = z.object({ id: objectIdSchema });
export const updateEmergencyStatusSchema = z
  .object({ status: z.enum(["en_route", "arrived", "completed"]) })
  .strict();
