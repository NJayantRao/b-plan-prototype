import type { NextFunction, Request, RequestHandler, Response } from "express";

type AsyncRequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
) => Promise<unknown>;

/**
 * Wraps an async controller so rejected promises reach the error middleware.
 * (Express 5 already forwards rejections; this keeps the pattern explicit and
 * works identically if a handler is ever reused outside Express 5.)
 */
const AsyncHandler = (fn: AsyncRequestHandler): RequestHandler => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

export default AsyncHandler;
