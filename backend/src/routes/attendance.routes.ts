import { Router } from "express";
import { db } from "../config/database.js";
import { fail, ok } from "../utils/response.js";
import {
  authenticate,
  requireAttendanceManagementAccess,
} from "../middleware/auth.js";
import { displayTime, hoursBetween, todayDate } from "../utils/date.js";
import type { AuthRequest } from "../types/auth.js";

export const attendanceRouter = Router();

function getCurrentEmployee(userId: number) {
  return db.prepare("SELECT id, shift_id FROM employees WHERE user_id = ?").get(userId) as { id: number; shift_id: number | null } | undefined;
}

function getDateDaysAgo(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

function getTodayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

attendanceRouter.get("/status", authenticate, (req, res) => {
  const authReq = req as AuthRequest;
  const employee = getCurrentEmployee(authReq.user.id);

  if (!employee) {
    return ok(res, {
      shift_name: "Not Assigned",
      shift_start: "--:--",
      shift_end: "--:--",
    });
  }

  const today = todayDate();
  const record = db.prepare("SELECT * FROM attendance WHERE employee_id = ? AND date = ?")
    .get(employee.id, today) as any;
  const shift = employee.shift_id
    ? db.prepare("SELECT * FROM shifts WHERE id = ?").get(employee.shift_id) as any
    : null;

  return ok(res, {
    ...(record || {}),
    shift_name: shift?.name || "Not Assigned",
    shift_start: shift?.start_time || "--:--",
    shift_end: shift?.end_time || "--:--",
  });
});

attendanceRouter.post("/check-in", authenticate, (req, res) => {
  const authReq = req as AuthRequest;
  const employee = getCurrentEmployee(authReq.user.id);
  if (!employee) return fail(res, 400, "Employee profile not found");

  const now = new Date();
  const today = todayDate();
  const existing = db.prepare("SELECT * FROM attendance WHERE employee_id = ? AND date = ?")
    .get(employee.id, today) as any;

  if (existing?.check_in) {
    return ok(res, existing, "Already checked in today");
  }

  db.prepare(`
    INSERT INTO attendance (employee_id, date, check_in, check_in_at, status)
    VALUES (?, ?, ?, ?, 'present')
    ON CONFLICT(employee_id, date) DO UPDATE SET
      check_in = excluded.check_in,
      check_in_at = excluded.check_in_at,
      status = 'present',
      updated_at = CURRENT_TIMESTAMP
  `).run(employee.id, today, displayTime(now), now.toISOString());

  return ok(res, null, "Checked in successfully");
});

attendanceRouter.post("/check-out", authenticate, (req, res) => {
  const authReq = req as AuthRequest;
  const employee = getCurrentEmployee(authReq.user.id);
  if (!employee) return fail(res, 400, "Employee profile not found");

  const now = new Date();
  const today = todayDate();
  const record = db.prepare("SELECT * FROM attendance WHERE employee_id = ? AND date = ?")
    .get(employee.id, today) as any;

  if (!record?.check_in) {
    return fail(res, 400, "Check-in is required before check-out");
  }

  if (record?.check_out) {
    return ok(res, record, "Already checked out today");
  }

  const checkOutIso = now.toISOString();
  const totalHours = hoursBetween(record.check_in_at, checkOutIso);

  db.prepare(`
    UPDATE attendance
    SET check_out = ?, check_out_at = ?, total_hours = ?, updated_at = CURRENT_TIMESTAMP
    WHERE employee_id = ? AND date = ?
  `).run(displayTime(now), checkOutIso, totalHours, employee.id, today);

  return ok(res, null, "Checked out successfully");
});

attendanceRouter.get("/monthly-summary", authenticate, (req, res) => {
  const authReq = req as AuthRequest;
  const employee = getCurrentEmployee(authReq.user.id);
  if (!employee) return ok(res, { present: 0, absent: 0, totalHours: 0 });

  const month = String(req.query.month || new Date().toISOString().slice(0, 7));
  const rows = db.prepare(`
    SELECT * FROM attendance
    WHERE employee_id = ? AND substr(date, 1, 7) = ?
  `).all(employee.id, month) as any[];

  const present = rows.filter((row) => row.status === "present").length;
  const totalHours = rows.reduce((sum, row) => sum + Number(row.total_hours || 0), 0);

  const today = new Date();
const year = today.getFullYear();
const monthIndex = today.getMonth();
const totalDaysUntilToday = today.getDate();

const absent = Math.max(totalDaysUntilToday - present, 0);

return ok(res, { present, absent, totalHours });
});

attendanceRouter.get("/my-history", authenticate, (req, res) => {
  const authReq = req as AuthRequest;
  const employee = getCurrentEmployee(authReq.user.id);

  if (!employee) {
    return ok(res, []);
  }

  const days = Number(req.query.days || 30);
  const fromDate = getDateDaysAgo(days);
  const toDate = getTodayIsoDate();

  const rows = db.prepare(`
    SELECT
      a.id,
      a.date,
      a.check_in,
      a.check_out,
      a.total_hours,
      a.status,
      s.name as shift_name
    FROM attendance a
    LEFT JOIN employees e ON e.id = a.employee_id
    LEFT JOIN shifts s ON s.id = e.shift_id
    WHERE a.employee_id = ?
      AND a.date BETWEEN ? AND ?
    ORDER BY a.date DESC
  `).all(employee.id, fromDate, toDate);

  return ok(res, rows);
});

attendanceRouter.get("/report", authenticate, requireAttendanceManagementAccess, (req, res) => {
  const fromDate = String(req.query.from || getDateDaysAgo(30));
  const toDate = String(req.query.to || getTodayIsoDate());

  const rows = db.prepare(`
    SELECT
      a.id,
      a.date,
      a.check_in,
      a.check_out,
      a.total_hours,
      a.status,

      e.id as employee_db_id,
      e.employee_id,
      e.first_name,
      e.last_name,
      e.email,

      d.name as department_name,
      des.title as designation_name,
      s.name as shift_name
    FROM attendance a
    JOIN employees e ON e.id = a.employee_id
    LEFT JOIN departments d ON d.id = e.department_id
    LEFT JOIN designations des ON des.id = e.designation_id
    LEFT JOIN shifts s ON s.id = e.shift_id
    WHERE a.date BETWEEN ? AND ?
      AND e.status != 'inactive'
    ORDER BY a.date DESC, e.first_name ASC, e.last_name ASC
  `).all(fromDate, toDate);

  return ok(res, rows);
});