import type { NextFunction, Request, Response } from "express";
import { fail } from "../utils/response.js";

export function notFound(req: Request, res: Response) {
  return fail(res, 404, `Route not found: ${req.method} ${req.originalUrl}`);
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  console.error(err);
  const message = err instanceof Error ? err.message : "Internal server error";
  return fail(res, 500, message);
}
