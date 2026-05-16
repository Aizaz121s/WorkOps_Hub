import { Router } from "express";
import { db } from "../config/database.js";
import {
  authenticate,
  canManageLeaves,
  requireLeaveManagementAccess,
} from "../middleware/auth.js";
import { fail, ok } from "../utils/response.js";
import type { AuthRequest } from "../types/auth.js";

export const leavesRouter = Router();

const ANNUAL_LEAVE_LIMIT = 15;
const SICK_LEAVE_LIMIT = 7;

function currentEmployeeId(userId: number) {
  const employee = db
    .prepare("SELECT id FROM employees WHERE user_id = ?")
    .get(userId) as { id: number } | undefined;

  return employee?.id;
}

function leaveDaysSql() {
  return `
    CASE
      WHEN l.start_date IS NOT NULL AND l.end_date IS NOT NULL
      THEN CAST((julianday(l.end_date) - julianday(l.start_date)) + 1 AS INTEGER)
      ELSE 0
    END
  `;
}

leavesRouter.get("/", authenticate, (req, res) => {
  const authReq = req as AuthRequest;

  let leaves;

  if (canManageLeaves(req)) {
    leaves = db.prepare(`
      SELECT 
        l.*, 
        e.first_name, 
        e.last_name,
        e.employee_id,
        d.name as department_name
      FROM leaves l
      JOIN employees e ON e.id = l.employee_id
      LEFT JOIN departments d ON d.id = e.department_id
      ORDER BY l.created_at DESC
    `).all();
  } else {
    leaves = db.prepare(`
      SELECT 
        l.*, 
        e.first_name, 
        e.last_name,
        e.employee_id,
        d.name as department_name
      FROM leaves l
      JOIN employees e ON e.id = l.employee_id
      LEFT JOIN departments d ON d.id = e.department_id
      WHERE e.user_id = ?
      ORDER BY l.created_at DESC
    `).all(authReq.user.id);
  }

  return ok(res, leaves);
});

leavesRouter.get("/summary", authenticate, (req, res) => {
  const authReq = req as AuthRequest;
  const employeeId = currentEmployeeId(authReq.user.id);

  if (!employeeId) {
    return fail(res, 400, "User is not linked with an employee profile");
  }

  const summary = db.prepare(`
    SELECT
      COALESCE(SUM(
        CASE 
          WHEN LOWER(l.type) IN ('annual', 'annual leave') AND status = 'approved'
          THEN ${leaveDaysSql()}
          ELSE 0
        END
      ), 0) as annual_used,

      COALESCE(SUM(
        CASE 
          WHEN LOWER(l.type) IN ('sick', 'sick leave') AND status = 'approved'
          THEN ${leaveDaysSql()}
          ELSE 0
        END
      ), 0) as sick_used,

      COALESCE(SUM(
        CASE 
          WHEN status = 'pending'
          THEN 1
          ELSE 0
        END
      ), 0) as pending_requests,

      COALESCE(SUM(
        CASE 
          WHEN status = 'approved'
          THEN ${leaveDaysSql()}
          ELSE 0
        END
      ), 0) as total_approved_days,

      COALESCE(SUM(
        CASE 
          WHEN status = 'approved'
          THEN 1
          ELSE 0
        END
      ), 0) as approved_requests,

      COALESCE(SUM(
        CASE 
          WHEN status = 'rejected'
          THEN 1
          ELSE 0
        END
      ), 0) as rejected_requests
    FROM leaves l
    WHERE l.employee_id = ?
  `).get(employeeId) as any;

  const annualUsed = Number(summary?.annual_used || 0);
  const sickUsed = Number(summary?.sick_used || 0);

  return ok(res, {
    annualLimit: ANNUAL_LEAVE_LIMIT,
    annualUsed,
    annualRemaining: Math.max(ANNUAL_LEAVE_LIMIT - annualUsed, 0),

    sickLimit: SICK_LEAVE_LIMIT,
    sickUsed,
    sickRemaining: Math.max(SICK_LEAVE_LIMIT - sickUsed, 0),

    pendingRequests: Number(summary?.pending_requests || 0),
    approvedRequests: Number(summary?.approved_requests || 0),
    rejectedRequests: Number(summary?.rejected_requests || 0),
    totalApprovedDays: Number(summary?.total_approved_days || 0),
  });
});

leavesRouter.get("/report", authenticate, requireLeaveManagementAccess, (_req, res) => {
  const report = db.prepare(`
    SELECT
      e.id as employee_id_db,
      e.employee_id,
      e.first_name,
      e.last_name,
      e.email,
      d.name as department_name,

      COALESCE(SUM(
        CASE 
          WHEN LOWER(l.type) = 'annual' AND l.status = 'approved'
          THEN ${leaveDaysSql()}
          ELSE 0
        END
      ), 0) as annual_used,

      COALESCE(SUM(
        CASE 
          WHEN LOWER(l.type) = 'sick' AND l.status = 'approved'
          THEN ${leaveDaysSql()}
          ELSE 0
        END
      ), 0) as sick_used,

      COALESCE(SUM(
        CASE 
          WHEN l.status = 'pending'
          THEN 1
          ELSE 0
        END
      ), 0) as pending_requests,

      COALESCE(SUM(
        CASE 
          WHEN l.status = 'approved'
          THEN 1
          ELSE 0
        END
      ), 0) as approved_requests,

      COALESCE(SUM(
        CASE 
          WHEN l.status = 'rejected'
          THEN 1
          ELSE 0
        END
      ), 0) as rejected_requests,

      COALESCE(SUM(
        CASE 
          WHEN l.status = 'approved'
          THEN ${leaveDaysSql()}
          ELSE 0
        END
      ), 0) as total_approved_days

    FROM employees e
    LEFT JOIN departments d ON d.id = e.department_id
    LEFT JOIN leaves l ON l.employee_id = e.id
    WHERE e.status != 'inactive'
    GROUP BY e.id
    ORDER BY e.first_name ASC, e.last_name ASC
  `).all() as any[];

  const formatted = report.map((row) => {
    const annualUsed = Number(row.annual_used || 0);
    const sickUsed = Number(row.sick_used || 0);

    return {
      ...row,
      annual_used: annualUsed,
      annual_limit: ANNUAL_LEAVE_LIMIT,
      annual_remaining: Math.max(ANNUAL_LEAVE_LIMIT - annualUsed, 0),

      sick_used: sickUsed,
      sick_limit: SICK_LEAVE_LIMIT,
      sick_remaining: Math.max(SICK_LEAVE_LIMIT - sickUsed, 0),

      pending_requests: Number(row.pending_requests || 0),
      approved_requests: Number(row.approved_requests || 0),
      rejected_requests: Number(row.rejected_requests || 0),
      total_approved_days: Number(row.total_approved_days || 0),
    };
  });

  return ok(res, formatted);
});

leavesRouter.post("/", authenticate, (req, res) => {
  const authReq = req as AuthRequest;
  const employeeId = currentEmployeeId(authReq.user.id);

  if (!employeeId) {
    return fail(res, 400, "User is not linked with an employee profile");
  }

  const { type, start_date, end_date, reason = null } = req.body ?? {};

  if (!type || !start_date || !end_date) {
    return fail(res, 400, "Leave type, start date, and end date are required");
  }

  const start = new Date(start_date);
  const end = new Date(end_date);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return fail(res, 400, "Invalid leave dates");
  }

  if (end < start) {
    return fail(res, 400, "End date cannot be before start date");
  }

  const result = db.prepare(`
    INSERT INTO leaves (employee_id, type, start_date, end_date, reason)
    VALUES (?, ?, ?, ?, ?)
  `).run(employeeId, type, start_date, end_date, reason);

  return ok(res, { id: result.lastInsertRowid }, "Leave request submitted");
});

leavesRouter.put("/:id/status", authenticate, requireLeaveManagementAccess, (req, res) => {
  const authReq = req as AuthRequest;
  const { status } = req.body ?? {};
  const allowed = ["pending", "approved", "rejected"];

  if (!allowed.includes(status)) {
    return fail(res, 400, "Invalid leave status");
  }

  const leave = db.prepare(`
    SELECT id, employee_id
    FROM leaves
    WHERE id = ?
  `).get(req.params.id) as { id: number; employee_id: number } | undefined;

  if (!leave) {
    return fail(res, 404, "Leave request not found");
  }

  const approverId = currentEmployeeId(authReq.user.id) || null;

  if (approverId && approverId === leave.employee_id) {
    return fail(res, 400, "You cannot approve or reject your own leave request");
  }

  db.prepare(`
    UPDATE leaves
    SET status = ?, approved_by = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(status, approverId, req.params.id);

  return ok(res, null, `Leave ${status}`);
});
// import { Router } from "express";
// import { db } from "../config/database.js";
// import { authenticate } from "../middleware/auth.js";
// import { fail, ok } from "../utils/response.js";
// import type { AuthRequest } from "../types/auth.js";

// export const leavesRouter = Router();

// function currentEmployeeId(userId: number) {
//   const employee = db.prepare("SELECT id FROM employees WHERE user_id = ?").get(userId) as { id: number } | undefined;
//   return employee?.id;
// }

// leavesRouter.get("/", authenticate, (req, res) => {
//   const authReq = req as AuthRequest;

//   let leaves;
//   if (authReq.user.role === "employee") {
//     leaves = db.prepare(`
//       SELECT l.*, e.first_name, e.last_name
//       FROM leaves l
//       JOIN employees e ON e.id = l.employee_id
//       WHERE e.user_id = ?
//       ORDER BY l.created_at DESC
//     `).all(authReq.user.id);
//   } else {
//     leaves = db.prepare(`
//       SELECT l.*, e.first_name, e.last_name
//       FROM leaves l
//       JOIN employees e ON e.id = l.employee_id
//       ORDER BY l.created_at DESC
//     `).all();
//   }

//   return ok(res, leaves);
// });

// leavesRouter.post("/", authenticate, (req, res) => {
//   const authReq = req as AuthRequest;
//   const employeeId = currentEmployeeId(authReq.user.id);
//   if (!employeeId) return fail(res, 400, "User is not linked with an employee profile");

//   const { type, start_date, end_date, reason = null } = req.body ?? {};
//   if (!type || !start_date || !end_date) {
//     return fail(res, 400, "Leave type, start date, and end date are required");
//   }

//   const result = db.prepare(`
//     INSERT INTO leaves (employee_id, type, start_date, end_date, reason)
//     VALUES (?, ?, ?, ?, ?)
//   `).run(employeeId, type, start_date, end_date, reason);

//   return ok(res, { id: result.lastInsertRowid }, "Leave request submitted");
// });

// leavesRouter.put("/:id/status", authenticate, (req, res) => {
//   const authReq = req as AuthRequest;
//   const { status } = req.body ?? {};
//   const allowed = ["pending", "approved", "rejected"];

//   if (!allowed.includes(status)) {
//     return fail(res, 400, "Invalid leave status");
//   }

//   const approverId = currentEmployeeId(authReq.user.id) || null;
//   db.prepare(`
//     UPDATE leaves
//     SET status = ?, approved_by = ?, updated_at = CURRENT_TIMESTAMP
//     WHERE id = ?
//   `).run(status, approverId, req.params.id);

//   return ok(res, null, `Leave ${status}`);
// });
