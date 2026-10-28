import { z } from "zod";
import { paginationSchema } from "../utils/pagination.js";
import { objectIdSchema } from "./common.validator.js";

export const listNotificationsQuerySchema = paginationSchema;
export const notificationIdParamSchema = z.object({ id: objectIdSchema });
