import { Router } from "express";
import { db } from "../config/database.js";
import { authenticate } from "../middleware/auth.js";
import { fail, ok } from "../utils/response.js";

export const payrollRouter = Router();

payrollRouter.get("/", authenticate, (_req, res) => {
  const payroll = db.prepare(`
    SELECT p.*, e.first_name, e.last_name, e.employee_id
    FROM payroll p
    JOIN employees e ON e.id = p.employee_id
    ORDER BY p.year DESC, p.month DESC, p.created_at DESC
  `).all();

  return ok(res, payroll);
});

payrollRouter.post("/generate", authenticate, (req, res) => {
  const { month, year } = req.body ?? {};
  if (!month || !year) return fail(res, 400, "Month and year are required");

  const employees = db.prepare("SELECT id, salary FROM employees WHERE status = 'active'").all() as Array<{ id: number; salary: number | null }>;
  const insert = db.prepare(`
    INSERT INTO payroll (employee_id, month, year, base_salary, bonus, deductions, net_salary, status)
    VALUES (?, ?, ?, ?, 0, 0, ?, 'pending')
    ON CONFLICT(employee_id, month, year) DO NOTHING
  `);

  const transaction = db.transaction(() => {
    let created = 0;
    for (const employee of employees) {
      const salary = Number(employee.salary || 0);
      const result = insert.run(employee.id, month, Number(year), salary, salary);
      if (result.changes > 0) created += 1;
    }
    return created;
  });

  const createdCount = transaction();
  return ok(res, { created: createdCount }, "Payroll generated successfully");
});

payrollRouter.post("/:id/pay", authenticate, (req, res) => {
  db.prepare("UPDATE payroll SET status = 'paid', updated_at = CURRENT_TIMESTAMP WHERE id = ?")
    .run(req.params.id);
  return ok(res, null, "Payroll marked as paid");
});
