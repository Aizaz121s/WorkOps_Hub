import { Router } from "express";
import { db } from "../config/database.js";
import { authenticate } from "../middleware/auth.js";
import { fail, ok } from "../utils/response.js";

export const shiftsRouter = Router();

shiftsRouter.get("/", authenticate, (_req, res) => {
  return ok(res, db.prepare("SELECT * FROM shifts ORDER BY id ASC").all());
});

shiftsRouter.post("/", authenticate, (req, res) => {
  const { name, start_time, end_time } = req.body ?? {};
  if (!name || !start_time || !end_time) {
    return fail(res, 400, "Shift name, start time, and end time are required");
  }

  const result = db.prepare("INSERT INTO shifts (name, start_time, end_time) VALUES (?, ?, ?)")
    .run(String(name).trim(), String(start_time).trim(), String(end_time).trim());

  return ok(res, { id: result.lastInsertRowid }, "Shift created successfully");
});

shiftsRouter.delete("/:id", authenticate, (req, res) => {
  db.prepare("UPDATE employees SET shift_id = NULL WHERE shift_id = ?").run(req.params.id);
  db.prepare("DELETE FROM shifts WHERE id = ?").run(req.params.id);
  return ok(res, null, "Shift deleted successfully");
});
