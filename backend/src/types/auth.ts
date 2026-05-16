import type { Request } from "express";

export interface JwtUser {
  id: number;
  email: string;
  role: string;
}

export type AuthRequest = Request & { user: JwtUser };
