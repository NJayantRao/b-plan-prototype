import type { Request, RequestHandler, Response } from "express";
import { getHealthReport } from "../services/health.service.js";
import ApiResponse from "../utils/api-response.js";
import AsyncHandler from "../utils/async-handler.js";

export const healthController: RequestHandler = AsyncHandler(
  async (_req: Request, res: Response) => {
    const report = getHealthReport();

    if (report.status === "ok") {
      return res
        .status(200)
        .json(new ApiResponse(200, "Magadh Ventures API is healthy", report));
    }

    // 503 so load balancers and uptime monitors see a dependency problem.
    return res
      .status(503)
      .json(
        new ApiResponse(503, "Magadh Ventures API is degraded", report),
      );
  },
);
