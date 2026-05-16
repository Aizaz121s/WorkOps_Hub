import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { fail } from "../utils/response.js";
import { db } from "../config/database.js";
import type { JwtUser } from "../types/auth.js";

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const cookieToken = req.cookies?.token;
  const bearer = req.headers.authorization?.startsWith("Bearer ")
    ? req.headers.authorization.slice(7)
    : null;
  const token = bearer || cookieToken;

  if (!token) {
    return fail(res, 401, "Not authenticated");
  }

  try {
    (req as Request & { user: JwtUser }).user = jwt.verify(token, env.jwtSecret) as JwtUser;
    next();
  } catch {
    return fail(res, 401, "Invalid or expired token");
  }
}

export const getSetting = (key: string, fallback = "false") => {
  const row = db
    .prepare("SELECT value FROM settings WHERE key = ?")
    .get(key) as { value?: string } | undefined;

  return row?.value ?? fallback;
};

export const isSuperAdmin = (req: Request) => {
  const user = (req as Request & { user?: JwtUser }).user;
  return user?.role === "super_admin";
};

export const canManageEmployees = (req: Request) => {
  const user = (req as Request & { user?: JwtUser }).user;

  if (user?.role === "super_admin") return true;

  if (user?.role === "hr_manager") {
    return getSetting("allow_hr_employee_management", "false") === "true";
  }

  return false;
};

export function requireSuperAdmin(req: Request, res: Response, next: NextFunction) {
  if (!isSuperAdmin(req)) {
    return fail(res, 403, "Only Super Admin can perform this action");
  }

  next();
}

export function requireEmployeeManagementAccess(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (!canManageEmployees(req)) {
    return fail(
      res,
      403,
      "Only Super Admin can add/delete employees. HR can do this only when Super Admin gives access."
    );
  }

  next();
}

export const canManageLeaves = (req: Request) => {
  const user = (req as Request & { user?: JwtUser }).user;

  if (user?.role === "super_admin") return true;

  if (user?.role === "hr_manager") {
    return getSetting("allow_hr_leave_management", "false") === "true";
  }

  return false;
};

export function requireLeaveManagementAccess(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (!canManageLeaves(req)) {
    return fail(
      res,
      403,
      "Only Super Admin can manage leaves. HR can do this only when Super Admin gives access."
    );
  }

  next();
}

export const canManageAttendance = (req: Request) => {
  const user = (req as Request & { user?: JwtUser }).user;

  if (user?.role === "super_admin") return true;

  if (user?.role === "hr_manager") {
    return getSetting("allow_hr_attendance_management", "false") === "true";
  }

  return false;
};

export function requireAttendanceManagementAccess(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (!canManageAttendance(req)) {
    return fail(
      res,
      403,
      "Only Super Admin can view attendance reports. HR can do this only when Super Admin gives access."
    );
  }

  next();
}