import type Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import { env } from "../config/env.js";

function getRoleId(db: Database.Database, roleName: string) {
  const role = db.prepare("SELECT id FROM roles WHERE name = ?").get(roleName) as { id: number } | undefined;
  if (!role) throw new Error(`Role missing: ${roleName}`);
  return role.id;
}

function createUserAndEmployee(db: Database.Database, input: {
  email: string;
  password: string;
  roleName: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  departmentId?: number | null;
  designationId?: number | null;
  shiftId?: number | null;
  joiningDate?: string | null;
  salary?: number | null;
}) {
  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(input.email) as { id: number } | undefined;
  if (existing) return;

  const passwordHash = bcrypt.hashSync(input.password, 10);
  const roleId = getRoleId(db, input.roleName);
  const userId = db.prepare("INSERT INTO users (email, password, role_id) VALUES (?, ?, ?)")
    .run(input.email, passwordHash, roleId).lastInsertRowid;

  db.prepare(`
    INSERT INTO employees (
      user_id, employee_id, first_name, last_name, email,
      department_id, designation_id, shift_id, joining_date, salary
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    userId,
    input.employeeId,
    input.firstName,
    input.lastName,
    input.email,
    input.departmentId ?? null,
    input.designationId ?? null,
    input.shiftId ?? null,
    input.joiningDate ?? null,
    input.salary ?? 0
  );
}

export function seed(db: Database.Database) {
  const transaction = db.transaction(() => {
    const roles = [
      ["super_admin", "Full system access"],
      ["company_admin", "Company administration access"],
      ["hr_manager", "HR operations access"],
      ["department_manager", "Department management access"],
      ["employee", "Employee self-service access"]
    ];
    const insertRole = db.prepare("INSERT OR IGNORE INTO roles (name, description) VALUES (?, ?)");
    roles.forEach((role) => insertRole.run(role[0], role[1]));

    const departments = ["HR", "Engineering", "Marketing", "Finance", "Sales"];
    const insertDepartment = db.prepare("INSERT OR IGNORE INTO departments (name) VALUES (?)");
    departments.forEach((department) => insertDepartment.run(department));

    const designations = ["Manager", "Senior Developer", "Junior Developer", "Accountant", "Product Designer", "Sales Lead"];
    const insertDesignation = db.prepare("INSERT OR IGNORE INTO designations (title) VALUES (?)");
    designations.forEach((designation) => insertDesignation.run(designation));

    // const shifts = [
    //   ["Day Shift", "09:00 AM", "06:00 PM"],
    //   ["Night Shift", "10:00 PM", "07:00 AM"],
    //   ["Afternoon Shift", "02:00 PM", "11:00 PM"]
    // ];
    // const insertShift = db.prepare("INSERT OR IGNORE INTO shifts (name, start_time, end_time) VALUES (?, ?, ?)");
    // shifts.forEach((shift) => insertShift.run(shift[0], shift[1], shift[2]));

    createUserAndEmployee(db, {
      email: env.adminEmail,
      password: env.adminPassword,
      roleName: "super_admin",
      employeeId: "EMP001",
      firstName: "Super",
      lastName: "Admin",
      departmentId: 1,
      designationId: 1,
      shiftId: 1,
      joiningDate: "2024-01-01",
      salary: 10000
    });

    createUserAndEmployee(db, {
      email: "sarah@titanhrms.com",
      password: env.adminPassword,
      roleName: "hr_manager",
      employeeId: "EMP002",
      firstName: "Sarah",
      lastName: "Wilson",
      departmentId: 2,
      designationId: 2,
      shiftId: 1,
      joiningDate: "2024-05-10",
      salary: 8500
    });

    createUserAndEmployee(db, {
      email: "john@titanhrms.com",
      password: env.adminPassword,
      roleName: "employee",
      employeeId: "EMP003",
      firstName: "John",
      lastName: "Doe",
      departmentId: 1,
      designationId: 1,
      shiftId: 1,
      joiningDate: "2025-01-15",
      salary: 7200
    });

    const jobsCount = (db.prepare("SELECT COUNT(*) as count FROM jobs").get() as { count: number }).count;
    if (jobsCount === 0) {
      const insertJob = db.prepare("INSERT INTO jobs (title, department, location, type) VALUES (?, ?, ?, ?)");
      insertJob.run("Product Designer", "Marketing", "Remote", "Full-time");
      insertJob.run("Sales Lead", "Sales", "London", "Full-time");
    }

    const candidatesCount = (db.prepare("SELECT COUNT(*) as count FROM candidates").get() as { count: number }).count;
    if (candidatesCount === 0) {
      db.prepare("INSERT INTO candidates (job_id, name, email, status) VALUES (?, ?, ?, ?)")
        .run(1, "Alice Smith", "alice@example.com", "applied");
    }

    const settings = {
      company_name: "WorkOps Hub",
      company_email: "contact@titanhrms.com",
      company_phone: "+1 555 0100",
      timezone: "UTC +5:30 (India)",
      notifications_email: "true",
      privacy_mode: "standard",

      allow_hr_employee_management: "false",
      allow_hr_leave_management: "false",
      allow_hr_attendance_management: "false",
    };

    const upsertSetting = db.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)");
    Object.entries(settings).forEach(([key, value]) => upsertSetting.run(key, value));
  });

  transaction();
}
