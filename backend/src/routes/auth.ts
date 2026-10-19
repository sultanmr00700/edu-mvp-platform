import { Router, Request, Response } from "express";
import { randomUUID } from "crypto";
import { UserRole } from "@prisma/client";
import prisma from "../prismaClient";
import { hashPassword, comparePassword } from "../lib/password";
import { signToken, TOKEN_COOKIE, sessionCookieOptions } from "../lib/jwt";
import { requireAuth } from "../middleware/auth";

const router = Router();

/** QR sessions are one-time and short-lived (2 minutes). */
const QR_TTL_MS = 2 * 60 * 1000;
const ALLOWED_ROLES = ["student", "parent", "admin", "teacher"];

type SafeUser = { id: number; name: string | null; email: string; role: string };

function toSafeUser(user: { id: number; name: string | null; email: string; role: string }): SafeUser {
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

// ---------------------------------------------------------------------------
// POST /api/auth/register — create an account (password hashed with bcrypt)
// ---------------------------------------------------------------------------
router.post("/register", async (req: Request, res: Response) => {
  try {
    const { name, email, password, role } = (req.body ?? {}) as Record<string, string>;
    if (!email || !password) {
      return res.status(400).json({ error: "email_and_password_required" });
    }
    const normalizedEmail = String(email).trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return res.status(400).json({ error: "invalid_email" });
    }
    if (String(password).length < 4) {
      return res.status(400).json({ error: "password_too_short" });
    }
    const userRole = (role || "student") as UserRole;
    if (!ALLOWED_ROLES.includes(userRole)) {
      return res.status(400).json({ error: "invalid_role" });
    }

    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      return res.status(409).json({ error: "email_already_registered" });
    }

    const passwordHash = await hashPassword(String(password));
    const user = await prisma.user.create({
      data: { name: name ? String(name) : null, email: normalizedEmail, passwordHash, role: userRole },
    });
    return res.status(201).json({ user: toSafeUser(user) });
  } catch (err) {
    console.error("[auth/register]", err);
    return res.status(500).json({ error: "server_error" });
  }
});

// ---------------------------------------------------------------------------
// POST /api/auth/login — email/password login.
// Returns { token, user }: the token is the "mobile JWT" (used e.g. to confirm
// a QR from another device). Also sets the web HttpOnly session cookie.
// ---------------------------------------------------------------------------
router.post("/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = (req.body ?? {}) as Record<string, string>;
    if (!email || !password) {
      return res.status(400).json({ error: "email_and_password_required" });
    }
    const normalizedEmail = String(email).trim().toLowerCase();
    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!user || !user.passwordHash) {
      return res.status(401).json({ error: "invalid_credentials" });
    }
    const ok = await comparePassword(String(password), user.passwordHash);
    if (!ok) {
      return res.status(401).json({ error: "invalid_credentials" });
    }
    const token = signToken({ userId: user.id, role: user.role });
    res.cookie(TOKEN_COOKIE, token, sessionCookieOptions());
    return res.json({ token, user: toSafeUser(user) });
  } catch (err) {
    console.error("[auth/login]", err);
    return res.status(500).json({ error: "server_error" });
  }
});

// ---------------------------------------------------------------------------
// POST /api/auth/logout — clear the web session cookie
// ---------------------------------------------------------------------------
router.post("/logout", (_req: Request, res: Response) => {
  res.clearCookie(TOKEN_COOKIE, { path: "/" });
  return res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// QR login flow
//   1. Web (already logged-in device or anonymous kiosk) calls qr/create.
//   2. The QR encodes the one-time token; it is displayed on the web page.
//   3. The phone (authenticated via mobile JWT) calls qr/confirm with the token.
//      The server marks the session used and sets the web HttpOnly cookie.
//   4. The web page polls qr/status and redirects on "confirmed".
// ---------------------------------------------------------------------------

// POST /api/auth/qr/create -> { token, expiresAt }
router.post("/qr/create", async (_req: Request, res: Response) => {
  try {
    const token = randomUUID();
    const expiresAt = new Date(Date.now() + QR_TTL_MS);
    await prisma.qrSession.create({ data: { token, expiresAt } });
    return res.json({ token, expiresAt });
  } catch (err) {
    console.error("[auth/qr/create]", err);
    return res.status(500).json({ error: "server_error" });
  }
});

// POST /api/auth/qr/confirm  (Authorization: Bearer <mobile JWT>)  { token }
router.post("/qr/confirm", requireAuth, async (req: Request, res: Response) => {
  try {
    const { token } = (req.body ?? {}) as Record<string, string>;
    if (!token) {
      return res.status(400).json({ error: "token_required" });
    }
    const session = await prisma.qrSession.findUnique({ where: { token: String(token) } });
    if (!session) {
      return res.status(404).json({ error: "not_found" });
    }
    if (session.used) {
      return res.status(400).json({ error: "already_used" });
    }
    if (session.expiresAt.getTime() < Date.now()) {
      return res.status(400).json({ error: "expired" });
    }

    const authUser = req.user!; // guaranteed by requireAuth
    await prisma.qrSession.update({
      where: { token: String(token) },
      data: { used: true, userId: authUser.userId },
    });

    // Issue the web session as an HttpOnly cookie.
    const webToken = signToken({ userId: authUser.userId, role: authUser.role });
    res.cookie(TOKEN_COOKIE, webToken, sessionCookieOptions());

    const user = await prisma.user.findUnique({ where: { id: authUser.userId } });
    return res.json({ ok: true, user: user ? toSafeUser(user) : null });
  } catch (err) {
    console.error("[auth/qr/confirm]", err);
    return res.status(500).json({ error: "server_error" });
  }
});

// GET /api/auth/qr/status?token=... -> { status: pending | confirmed | expired, user? }
router.get("/qr/status", async (req: Request, res: Response) => {
  try {
    const token = String(req.query.token ?? "");
    if (!token) {
      return res.status(400).json({ error: "token_required" });
    }
    const session = await prisma.qrSession.findUnique({
      where: { token },
      include: { user: true },
    });
    if (!session) {
      return res.status(404).json({ status: "not_found" });
    }
    if (session.used && session.userId && session.user) {
      return res.json({ status: "confirmed", user: toSafeUser(session.user) });
    }
    if (session.expiresAt.getTime() < Date.now()) {
      return res.json({ status: "expired" });
    }
    return res.json({ status: "pending" });
  } catch (err) {
    console.error("[auth/qr/status]", err);
    return res.status(500).json({ error: "server_error" });
  }
});

// ---------------------------------------------------------------------------
// GET /api/me — current user from cookie or Bearer header
// ---------------------------------------------------------------------------
export const meRouter = Router();
meRouter.get("/me", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
    if (!user) {
      return res.status(404).json({ error: "not_found" });
    }
    return res.json({ user: toSafeUser(user) });
  } catch (err) {
    console.error("[me]", err);
    return res.status(500).json({ error: "server_error" });
  }
});

export default router;
