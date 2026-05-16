import { Router } from "express";
import { db } from "../config/database.js";
import { authenticate, requireSuperAdmin } from "../middleware/auth.js";
import { ok } from "../utils/response.js";

export const settingsRouter = Router();

settingsRouter.get("/", authenticate,  (_req, res) => {
  const rows = db.prepare("SELECT key, value FROM settings").all() as Array<{ key: string; value: string }>;
  const settings = rows.reduce<Record<string, string>>((acc, row) => {
    acc[row.key] = row.value;
    return acc;
  }, {});

  return ok(res, settings);
});

settingsRouter.post("/", authenticate,requireSuperAdmin, (req, res) => {
  const settings = req.body ?? {};
  const upsert = db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)");

  const transaction = db.transaction(() => {
    Object.entries(settings).forEach(([key, value]) => {
      upsert.run(key, String(value ?? ""));
    });
  });

  transaction();
  return ok(res, null, "Settings saved successfully");
});
