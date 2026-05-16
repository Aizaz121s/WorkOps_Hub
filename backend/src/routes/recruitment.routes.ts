import { Router } from "express";
import { db } from "../config/database.js";
import { authenticate } from "../middleware/auth.js";
import { fail, ok } from "../utils/response.js";

export const recruitmentRouter = Router();

recruitmentRouter.get("/jobs", authenticate, (_req, res) => {
  const jobs = db.prepare("SELECT * FROM jobs ORDER BY created_at DESC").all();
  return ok(res, jobs);
});

recruitmentRouter.post("/jobs", authenticate, (req, res) => {
  const { title, department, location, type, status = "open" } = req.body ?? {};
  if (!title || !department || !location || !type) {
    return fail(res, 400, "Title, department, location, and type are required");
  }

  const result = db.prepare(`
    INSERT INTO jobs (title, department, location, type, status)
    VALUES (?, ?, ?, ?, ?)
  `).run(title, department, location, type, status);

  return ok(res, { id: result.lastInsertRowid }, "Job created successfully");
});

recruitmentRouter.patch("/jobs/:id", authenticate, (req, res) => {
  const allowed = ["title", "department", "location", "type", "status"];
  const updates = Object.entries(req.body ?? {}).filter(([key]) => allowed.includes(key));
  if (!updates.length) return fail(res, 400, "No valid fields to update");

  const setSql = updates.map(([key]) => `${key} = ?`).join(", ");
  const values = updates.map(([, value]) => value);
  db.prepare(`UPDATE jobs SET ${setSql}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(...values, req.params.id);
  return ok(res, null, "Job updated successfully");
});

recruitmentRouter.delete("/jobs/:id", authenticate, (req, res) => {
  db.prepare("DELETE FROM jobs WHERE id = ?").run(req.params.id);
  return ok(res, null, "Job deleted successfully");
});

recruitmentRouter.get("/candidates", authenticate, (_req, res) => {
  const candidates = db.prepare(`
    SELECT c.*, j.title as job_title
    FROM candidates c
    JOIN jobs j ON j.id = c.job_id
    ORDER BY c.created_at DESC
  `).all();

  return ok(res, candidates);
});

recruitmentRouter.post("/candidates", authenticate, (req, res) => {
  const { job_id, name, email, phone = null, status = "applied", resume_url = null } = req.body ?? {};
  if (!job_id || !name || !email) {
    return fail(res, 400, "Job, candidate name, and email are required");
  }

  const result = db.prepare(`
    INSERT INTO candidates (job_id, name, email, phone, status, resume_url)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(job_id, name, email, phone, status, resume_url);

  return ok(res, { id: result.lastInsertRowid }, "Candidate created successfully");
});

recruitmentRouter.put("/candidates/:id", authenticate, (req, res) => {
  const { status } = req.body ?? {};
  const allowed = ["applied", "interviewed", "hired", "rejected"];
  if (!allowed.includes(status)) return fail(res, 400, "Invalid candidate status");

  db.prepare("UPDATE candidates SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
    .run(status, req.params.id);

  return ok(res, null, "Candidate updated successfully");
});
