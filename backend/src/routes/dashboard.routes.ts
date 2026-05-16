import { Router } from "express";
import { db } from "../config/database.js";
import { authenticate } from "../middleware/auth.js";
import { ok } from "../utils/response.js";
import { todayDate } from "../utils/date.js";

export const dashboardRouter = Router();

function monthLabel(month: string) {
  const date = new Date(`${month}-01T00:00:00`);
  return date.toLocaleString("en-US", { month: "short" });
}

dashboardRouter.get("/stats", authenticate, (_req, res) => {
  const totalEmployees = db.prepare(`
    SELECT COUNT(*) as count 
    FROM employees 
    WHERE status != 'inactive'
  `).get() as { count: number };

  const activeEmployees = db.prepare(`
    SELECT COUNT(*) as count 
    FROM employees 
    WHERE status = 'active'
  `).get() as { count: number };

  const departments = db.prepare(`
    SELECT COUNT(*) as count 
    FROM departments
  `).get() as { count: number };

  const pendingLeaves = db.prepare(`
    SELECT COUNT(*) as count 
    FROM leaves 
    WHERE status = 'pending'
  `).get() as { count: number };

  const attendanceToday = db.prepare(`
    SELECT COUNT(*) as count 
    FROM attendance 
    WHERE date = ?
      AND status = 'present'
  `).get(todayDate()) as { count: number };

  const openJobs = db.prepare(`
    SELECT COUNT(*) as count 
    FROM jobs 
    WHERE status = 'open'
  `).get() as { count: number };

  const candidates = db.prepare(`
    SELECT COUNT(*) as count 
    FROM candidates
  `).get() as { count: number };

  const monthlyHiringTrendRaw = db.prepare(`
    SELECT 
      substr(joining_date, 1, 7) as month,
      COUNT(*) as count
    FROM employees
    WHERE joining_date IS NOT NULL
      AND status != 'inactive'
    GROUP BY substr(joining_date, 1, 7)
    ORDER BY month DESC
    LIMIT 6
  `).all() as Array<{ month: string; count: number }>;

  const monthlyHiringTrend = monthlyHiringTrendRaw
    .reverse()
    .map(row => ({
      name: monthLabel(row.month),
      count: row.count,
    }));

  const recentLeaves = db.prepare(`
    SELECT
      'leave' as type,
      l.created_at as created_at,
      l.status as status,
      l.type as leave_type,
      e.first_name,
      e.last_name
    FROM leaves l
    JOIN employees e ON e.id = l.employee_id
    ORDER BY l.created_at DESC
    LIMIT 5
  `).all() as any[];

  const recentEmployees = db.prepare(`
    SELECT
      'employee' as type,
      e.created_at as created_at,
      e.status as status,
      e.first_name,
      e.last_name,
      e.employee_id
    FROM employees e
    WHERE e.status != 'inactive'
    ORDER BY e.created_at DESC
    LIMIT 5
  `).all() as any[];

  const recentAttendance = db.prepare(`
    SELECT
      'attendance' as type,
      a.updated_at as created_at,
      a.status as status,
      a.check_in,
      a.check_out,
      e.first_name,
      e.last_name
    FROM attendance a
    JOIN employees e ON e.id = a.employee_id
    ORDER BY a.updated_at DESC
    LIMIT 5
  `).all() as any[];

  const recentActivity = [...recentLeaves, ...recentEmployees, ...recentAttendance]
    .filter(item => item.created_at)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 8)
    .map(item => {
      if (item.type === "leave") {
        return {
          type: "leave",
          title: `${item.first_name} ${item.last_name} requested ${item.leave_type}`,
          description: `Status: ${item.status}`,
          created_at: item.created_at,
        };
      }

      if (item.type === "attendance") {
        return {
          type: "attendance",
          title: `${item.first_name} ${item.last_name} updated attendance`,
          description: item.check_out
            ? `Checked out at ${item.check_out}`
            : `Checked in at ${item.check_in}`,
          created_at: item.created_at,
        };
      }

      return {
        type: "employee",
        title: `${item.first_name} ${item.last_name} joined`,
        description: `Employee ID: ${item.employee_id}`,
        created_at: item.created_at,
      };
    });

  return ok(res, {
    totalEmployees: totalEmployees.count,
    activeEmployees: activeEmployees.count,
    departmentsCount: departments.count,
    pendingLeaves: pendingLeaves.count,
    attendanceToday: attendanceToday.count,
    openJobs: openJobs.count,
    candidates: candidates.count,
    monthlyHiringTrend,
    recentActivity,
  });
});
