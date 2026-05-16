import { Router } from "express";
import bcrypt from "bcryptjs";
import { db } from "../config/database.js";
import { env } from "../config/env.js";
import { created, fail, ok } from "../utils/response.js";
import type { AuthRequest } from "../types/auth.js";
import {
  authenticate,
  canManageEmployees,
  requireEmployeeManagementAccess,
} from "../middleware/auth.js";

export const employeesRouter = Router();

const employeeSelect = `
  SELECT
    e.*,
    u.role_id,
    r.name as role_name,
    d.name as department_name,
    des.title as designation_name,
    s.name as shift_name
  FROM employees e
  LEFT JOIN users u ON u.id = e.user_id
  LEFT JOIN roles r ON r.id = u.role_id
  LEFT JOIN departments d ON d.id = e.department_id
  LEFT JOIN designations des ON des.id = e.designation_id
  LEFT JOIN shifts s ON s.id = e.shift_id
`;

function nextEmployeeId() {
  const row = db.prepare("SELECT COUNT(*) as count FROM employees").get() as { count: number };
  return `EMP${String(row.count + 1).padStart(3, "0")}`;
}

function isSuperAdminEmployee(employee: any) {
  return employee?.role_name === "super_admin" || employee?.role === "super_admin";
}

function isOwnEmployee(req: AuthRequest, employee: { user_id: number }) {
  return employee.user_id === req.user.id;
}

function canViewEmployeeDetail(req: AuthRequest, employee: { user_id: number }) {
  if (canManageEmployees(req)) return true;

  return isOwnEmployee(req, employee);
}

function canUpdateEmployee(req: AuthRequest, employee: any) {
  if (req.user.role === "super_admin") return true;

  if (req.user.role === "hr_manager" && canManageEmployees(req)) {
    if (isOwnEmployee(req, employee)) return false;
    if (isSuperAdminEmployee(employee)) return false;

    return true;
  }

  return false;
}

function canDeleteEmployee(req: AuthRequest, employee: any) {
  if (req.user.role === "super_admin") {
    return !isOwnEmployee(req, employee);
  }

  if (req.user.role === "hr_manager" && canManageEmployees(req)) {
    if (isOwnEmployee(req, employee)) return false;
    if (isSuperAdminEmployee(employee)) return false;

    return true;
  }

  return false;
}

employeesRouter.get("/me", authenticate, (req, res) => {
  const authReq = req as AuthRequest;
  const employee = db.prepare(`${employeeSelect} WHERE e.user_id = ?`).get(authReq.user.id);
  if (!employee) return fail(res, 404, "Employee profile not found");
  return ok(res, employee);
});


employeesRouter.get("/", authenticate, (_req, res) => {
  const employees = db
    .prepare(`${employeeSelect} WHERE e.status != 'inactive' ORDER BY e.created_at DESC`)
    .all();

  return ok(res, employees);
});

employeesRouter.post("/", authenticate, requireEmployeeManagementAccess, (req, res) => {
  const {
    first_name,
    last_name,
    email,
    phone = null,
    dob = null,
    gender = null,
    joining_date = null,
    department_id = null,
    designation_id = null,
    role_id,
    salary = 0,
    shift_id = null,
  } = req.body ?? {};

  if (!first_name || !last_name || !email || !role_id) {
    return fail(res, 400, "First name, last name, email and role are required");
  }
  const authReq = req as AuthRequest;

const selectedRole = db
  .prepare("SELECT name FROM roles WHERE id = ?")
  .get(Number(role_id)) as { name: string } | undefined;

if (!selectedRole) {
  return fail(res, 400, "Invalid role selected");
}

if (authReq.user.role !== "super_admin" && selectedRole.name === "super_admin") {
  return fail(res, 403, "HR cannot create Super Admin users");
}

  try {
    const transaction = db.transaction(() => {
      const passwordHash = bcrypt.hashSync(env.defaultEmployeePassword, 10);
      const userId = db.prepare("INSERT INTO users (email, password, role_id, must_change_password) VALUES (?, ?, ?, ?)").run(String(email).trim(), passwordHash, Number(role_id), 1).lastInsertRowid;

      const employeeId = nextEmployeeId();
      const result = db.prepare(`
  INSERT INTO employees (
    user_id, employee_id, first_name, last_name, email,
    phone, dob, gender, joining_date, department_id,
    designation_id, salary, shift_id
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`).run(
  userId,
  employeeId,
  String(first_name).trim(),
  String(last_name).trim(),
  String(email).trim(),
  phone,
  dob,
  gender,
  joining_date,
  department_id,
  designation_id,
  Number(salary || 0),
  shift_id
);

      return result.lastInsertRowid;
    });

    const id = transaction();
    return created(res, { id }, "Employee created successfully");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Employee creation failed";
    return fail(res, 400, message);
  }
});

employeesRouter.get("/:id", authenticate, (req, res) => {
  const authReq = req as AuthRequest;

  const employee = db
    .prepare(`${employeeSelect} WHERE e.id = ? AND e.status != 'inactive'`)
    .get(req.params.id) as any;

  if (!employee) return fail(res, 404, "Employee not found");

  if (!canViewEmployeeDetail(authReq, employee)) {
    return fail(res, 403, "You can only view your own employee profile");
  }

  const jobHistory = db.prepare(`
    SELECT * FROM job_history
    WHERE employee_id = ?
    ORDER BY start_date DESC
  `).all(employee.id);

  return ok(res, { ...employee, job_history: jobHistory });
});

employeesRouter.patch("/:id", authenticate, (req, res) => {
  const authReq = req as AuthRequest;

  const employee = db
  .prepare(`
    SELECT 
      e.id,
      e.user_id,
      e.status,
      r.name as role_name
    FROM employees e
    LEFT JOIN users u ON u.id = e.user_id
    LEFT JOIN roles r ON r.id = u.role_id
    WHERE e.id = ?
  `)
  .get(req.params.id) as any;

  if (!employee || employee.status === "inactive") {
    return fail(res, 404, "Employee not found");
  }

  if (!canUpdateEmployee(authReq, employee)) {
    return fail(res, 403, "You do not have permission to update this employee");
  }

  const allowed = [
    "first_name",
    "last_name",
    "phone",
    "dob",
    "gender",
    "joining_date",
    "department_id",
    "designation_id",
    "manager_id",
    "shift_id",
    "salary",
    "status",
  ];

  const updates = Object.entries(req.body ?? {}).filter(([key]) =>
    allowed.includes(key)
  );

  if (updates.length === 0) {
    return fail(res, 400, "No valid fields to update");
  }

  const setSql = updates.map(([key]) => `${key} = ?`).join(", ");
  const values = updates.map(([, value]) => value);

  db.prepare(`
    UPDATE employees
    SET ${setSql}, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(...values, req.params.id);

  return ok(res, { id: Number(req.params.id) }, "Employee updated successfully");
});

employeesRouter.post("/:id/image", authenticate, (req, res) => {
  const { image } = req.body ?? {};
  if (!image) return fail(res, 400, "Image is required");

  db.prepare("UPDATE employees SET profile_image = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
    .run(String(image), req.params.id);

  return ok(res, null, "Profile image updated");
});

employeesRouter.post("/:id/shift", authenticate, requireEmployeeManagementAccess, (req, res) => {
  const { shift_id } = req.body ?? {};
  db.prepare("UPDATE employees SET shift_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
    .run(shift_id || null, req.params.id);

  return ok(res, null, "Shift assigned successfully");
});

employeesRouter.delete("/:id", authenticate, requireEmployeeManagementAccess, (req, res) => {
  const authReq = req as AuthRequest;

  const employee = db
    .prepare(`
      SELECT 
        e.id,
        e.user_id,
        e.status,
        r.name as role_name
      FROM employees e
     LEFT JOIN users u ON u.id = e.user_id
LEFT JOIN roles r ON r.id = u.role_id
      WHERE e.id = ?
    `)
    .get(req.params.id) as any;

  if (!employee || employee.status === "inactive") {
    return fail(res, 404, "Employee not found");
  }

  if (!canDeleteEmployee(authReq, employee)) {
    return fail(res, 403, "You do not have permission to delete this employee");
  }

  db.prepare(`
    UPDATE employees
    SET status = 'inactive', updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(req.params.id);

  return ok(res, null, "Employee deleted successfully");
});
