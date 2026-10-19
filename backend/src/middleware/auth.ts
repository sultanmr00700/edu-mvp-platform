import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../lib/jwt";

/**
 * Extract a JWT from (in order):
 * 1. Authorization: Bearer <token>  — used by mobile / API clients
 * 2. "token" HttpOnly cookie         — set after QR confirm / web login
 */
export function extractToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (header && header.startsWith("Bearer ")) {
    return header.slice(7).trim();
  }
  const cookies = (req as unknown as { cookies?: Record<string, string> }).cookies;
  const cookieToken = cookies?.token;
  if (typeof cookieToken === "string" && cookieToken.length > 0) {
    return cookieToken;
  }
  return null;
}

/** Protects a route: 401 unless a valid JWT is present. Attaches req.user. */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const token = extractToken(req);
    if (!token) {
      return res.status(401).json({ error: "unauthorized" });
    }
    req.user = verifyToken(token);
    return next();
  } catch {
    return res.status(401).json({ error: "invalid_token" });
  }
}

/**
 * Role gate: use after requireAuth.
 * 403 unless the authenticated user has one of the given roles.
 */
export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "unauthorized" });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: "forbidden" });
    }
    return next();
  };
}
