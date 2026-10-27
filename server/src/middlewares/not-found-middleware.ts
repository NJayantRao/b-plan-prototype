import type { Request, Response } from "express";
import { NotFoundError } from "../utils/api-error.js";

const notFoundMiddleware = (req: Request, _res: Response): never => {
  throw new NotFoundError(`Route not found: ${req.method} ${req.path}`);
};

export default notFoundMiddleware;
