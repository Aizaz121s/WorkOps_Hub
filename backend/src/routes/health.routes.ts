import { Router } from "express";
import { ok } from "../utils/response.js";

export const healthRouter = Router();

healthRouter.get("/health", (_req, res) => {
  return ok(res, { status: "ok", service: "titan-hrms-backend", timestamp: new Date().toISOString() });
});
