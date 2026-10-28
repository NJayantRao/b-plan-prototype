import { z } from "zod";
import { BLOOD_GROUPS, DONATION_TYPES, DONOR_REQUEST_STATUSES } from "../constants/supporting.js";
import { paginationSchema } from "../utils/pagination.js";
import { objectIdSchema } from "./common.validator.js";

export const donorProfileSchema = z
  .object({
    donationTypes: z.array(z.enum(DONATION_TYPES)).min(1).max(DONATION_TYPES.length),
    bloodGroup: z.enum(BLOOD_GROUPS).optional(),
    city: z.string().trim().min(1).max(100),
    state: z.string().trim().min(1).max(100),
    available: z.boolean(),
    consentGranted: z.boolean(),
  })
  .strict();
export type DonorProfileInput = z.infer<typeof donorProfileSchema>;

export const donorSearchSchema = z
  .object({
    donationType: z.enum(DONATION_TYPES),
    bloodGroup: z.enum(BLOOD_GROUPS).optional(),
    city: z.string().trim().min(1).max(100),
    state: z.string().trim().min(1).max(100),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();
export type DonorSearchInput = z.infer<typeof donorSearchSchema>;

export const createDonorRequestSchema = z
  .object({
    donationType: z.enum(DONATION_TYPES),
    bloodGroup: z.enum(BLOOD_GROUPS).optional(),
    city: z.string().trim().min(1).max(100),
    state: z.string().trim().min(1).max(100),
  })
  .strict();
export type CreateDonorRequestInput = z.infer<typeof createDonorRequestSchema>;

export const listDonorRequestsQuerySchema = paginationSchema.extend({
  status: z.enum(DONOR_REQUEST_STATUSES).optional(),
});

export const donorRequestParamsSchema = z.object({ id: objectIdSchema });
export const updateDonorRequestSchema = z
  .object({ status: z.enum(["cancelled", "fulfilled"]) })
  .strict();
