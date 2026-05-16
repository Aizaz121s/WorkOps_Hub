import { Router } from "express";
import { db } from "../config/database.js";
import { authenticate } from "../middleware/auth.js";
import { ok } from "../utils/response.js";

export const metaRouter = Router();

metaRouter.get("/roles", authenticate, (_req, res) => {
  return ok(res, db.prepare("SELECT id, name, description FROM roles ORDER BY id ASC").all());
});

metaRouter.get("/departments", authenticate, (_req, res) => {
  return ok(res, db.prepare("SELECT * FROM departments ORDER BY name ASC").all());
});

metaRouter.get("/designations", authenticate, (_req, res) => {
  return ok(res, db.prepare("SELECT * FROM designations ORDER BY title ASC").all());
});
