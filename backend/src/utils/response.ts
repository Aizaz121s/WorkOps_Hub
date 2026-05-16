import type { Response } from "express";

export function ok(res: Response, data: unknown = null, message?: string) {
  return res.json({ success: true, data, ...(message ? { message } : {}) });
}

export function created(res: Response, data: unknown = null, message?: string) {
  return res.status(201).json({ success: true, data, ...(message ? { message } : {}) });
}

export function fail(res: Response, status: number, message: string, details?: unknown) {
  return res.status(status).json({ success: false, message, ...(details ? { details } : {}) });
}
