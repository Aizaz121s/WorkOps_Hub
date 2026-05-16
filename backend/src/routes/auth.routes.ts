import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db } from "../config/database.js";
import { env } from "../config/env.js";
import { authenticate } from "../middleware/auth.js";
import { fail, ok } from "../utils/response.js";
import type { AuthRequest } from "../types/auth.js";

export const authRouter = Router();

authRouter.post("/login", (req, res) => {
  const { email, password } = req.body ?? {};

  if (!email || !password) {
    return fail(res, 400, "Email and password are required");
  }

  const user = db.prepare(`
    SELECT u.*, r.name as role_name
    FROM users u
    JOIN roles r ON r.id = u.role_id
    WHERE lower(u.email) = lower(?) AND u.status = 'active'
  `).get(String(email).trim()) as any;

  if (!user || !bcrypt.compareSync(String(password), user.password)) {
    return fail(res, 401, "Invalid credentials");
  }

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role_name },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn as any }
  );

  res.cookie("token", token, {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: env.isProduction ? "strict" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  return ok(res, {
    user: { id: user.id, email: user.email, role: user.role_name },
    token,
  });
});

authRouter.get("/me", authenticate, (req, res) => {
  const authReq = req as AuthRequest;
  const user = db.prepare(`
    SELECT u.id, u.must_change_password, u.email, r.name as role
    FROM users u
    JOIN roles r ON r.id = u.role_id
    WHERE u.id = ? AND u.status = 'active'
  `).get(authReq.user.id);

  if (!user) return fail(res, 404, "User not found");
  return ok(res, user);
});

authRouter.post("/logout", (_req, res) => {
  res.clearCookie("token");
  return ok(res, null, "Logged out successfully");
});

authRouter.post("/change-password", authenticate, (req, res) => {
  const authReq = req as AuthRequest;
  const { current_password, new_password, confirm_password } = req.body ?? {};

  if (!current_password || !new_password || !confirm_password) {
    return fail(res, 400, "Current password, new password and confirm password are required");
  }

  if (new_password !== confirm_password) {
    return fail(res, 400, "New password and confirm password do not match");
  }

  if (new_password.length < 8) {
    return fail(res, 400, "New password must be at least 8 characters");
  }

  const user = db
    .prepare("SELECT id, password FROM users WHERE id = ?")
    .get(authReq.user.id) as { id: number; password: string } | undefined;

  if (!user) {
    return fail(res, 404, "User not found");
  }

  const validPassword = bcrypt.compareSync(current_password, user.password);

  if (!validPassword) {
    return fail(res, 400, "Current password is incorrect");
  }

  const newHash = bcrypt.hashSync(new_password, 10);

  db.prepare(`
    UPDATE users
    SET password = ?, must_change_password = 0, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(newHash, user.id);

  return ok(res, null, "Password changed successfully");
});