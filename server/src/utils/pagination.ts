import { z } from "zod";

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export const buildPagination = (
  page: number,
  limit: number,
  total: number,
): Pagination => ({
  page,
  limit,
  total,
  totalPages: Math.max(1, Math.ceil(total / limit)),
});
