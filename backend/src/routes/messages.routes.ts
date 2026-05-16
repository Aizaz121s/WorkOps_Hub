import { Router } from "express";
import { db } from "../config/database.js";
import { authenticate } from "../middleware/auth.js";
import { fail, ok } from "../utils/response.js";
import type { AuthRequest } from "../types/auth.js";

export const messagesRouter = Router();

messagesRouter.get("/:otherId", authenticate, (req, res) => {
  const authReq = req as AuthRequest;
  const employee = db.prepare("SELECT id FROM employees WHERE user_id = ?").get(authReq.user.id) as { id: number } | undefined;
  if (!employee) return fail(res, 400, "Employee profile not found");

  const otherId = Number(req.params.otherId);
  const messages = db.prepare(`
    SELECT * FROM messages
    WHERE (sender_id = ? AND receiver_id = ?)
       OR (sender_id = ? AND receiver_id = ?)
    ORDER BY created_at ASC
  `).all(employee.id, otherId, otherId, employee.id);

  return ok(res, messages);
});
