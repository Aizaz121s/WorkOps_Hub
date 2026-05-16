import type { NextFunction, Response } from "express";
import type { AuthRequest } from "../types/auth.js";
import { fail } from "../utils/response.js";

export function requireAnyRole(allowedRoles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!allowedRoles.includes(req.user.role)) {
      return fail(res, 403, "You do not have permission to perform this action");
    }
    next();
  };
}
