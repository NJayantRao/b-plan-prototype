import { z } from "zod";
import { FACILITY_STATUSES, FACILITY_TYPES } from "../constants/supporting.js";
import { paginationSchema } from "../utils/pagination.js";
import { objectIdSchema } from "./common.validator.js";

const text = (max: number) => z.string().trim().min(1).max(max);

export const createFacilitySchema = z
  .object({
    name: text(150),
    type: z.enum(FACILITY_TYPES),
    address: z
      .object({
        city: text(100),
        state: text(100),
        country: z.string().trim().length(2).toUpperCase(),
        pincode: z.string().trim().min(3).max(10).optional(),
      })
      .strict(),
    supportedServices: z.array(text(100)).max(20).default([]),
    contactPhone: z.string().trim().min(7).max(30).optional(),
    contactEmail: z.email().optional(),
  })
  .strict();
export type CreateFacilityInput = z.infer<typeof createFacilitySchema>;

export const listFacilitiesQuerySchema = paginationSchema.extend({
  city: z.string().trim().min(1).max(100).optional(),
  state: z.string().trim().min(1).max(100).optional(),
  type: z.enum(FACILITY_TYPES).optional(),
});

export const facilityIdParamSchema = z.object({ id: objectIdSchema });
export const verifyFacilitySchema = z
  .object({
    status: z.enum(FACILITY_STATUSES),
    notes: z.string().trim().min(1).max(500).optional(),
  })
  .strict()
  .refine((input) => input.status !== "pending" || input.notes === undefined, {
    message: "Notes are only supported when approving or rejecting a facility",
    path: ["notes"],
  });

export const setResponderAuthorizationSchema = z
  .object({ authorized: z.boolean() })
  .strict();
