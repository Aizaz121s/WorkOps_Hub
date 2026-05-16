import { Router } from "express";
import { db } from "../config/database.js";
import { authenticate } from "../middleware/auth.js";
import { fail, ok } from "../utils/response.js";
import type { AuthRequest } from "../types/auth.js";

export const chatRouter = Router();

chatRouter.get("/contacts", authenticate, (req, res) => {
  const authReq = req as AuthRequest;
  const currentEmployee = db.prepare("SELECT id FROM employees WHERE user_id = ?")
    .get(authReq.user.id) as { id: number } | undefined;

  if (!currentEmployee) return fail(res, 400, "Employee profile not found");

  const employees = db.prepare(`
    SELECT
      e.id,
      e.first_name,
      e.last_name,
      e.profile_image,
      e.email,
      e.status,
      des.title as designation_name,
      d.name as department_name
    FROM employees e
    LEFT JOIN designations des ON des.id = e.designation_id
    LEFT JOIN departments d ON d.id = e.department_id
    WHERE e.id != ? AND e.status = 'active'
    ORDER BY e.first_name ASC, e.last_name ASC
  `).all(currentEmployee.id);

  return ok(res, employees);
});
