import jwt from "jsonwebtoken";

const JWT_EXPIRES_IN = "1h";
export const TOKEN_COOKIE = "token";

export type TokenPayload = {
  userId: number;
  role: string;
};

function getSecret(): string {
  return process.env.JWT_SECRET || "dev-secret-key";
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, getSecret(), { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, getSecret()) as TokenPayload;
}

// Cookie options for the web session (HttpOnly so JS cannot read it).
export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.COOKIE_SECURE === "true",
    path: "/",
    maxAge: 60 * 60 * 1000, // 1h — same as JWT
  };
}
