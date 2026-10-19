import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { api, MOBILE_TOKEN_KEY, User } from "../lib/api";

/** Shared glass navbar — links adapt to the user's role. */
export default function Nav() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    api<{ user: User }>("/api/me")
      .then((d) => setUser(d.user))
      .catch(() => setUser(null));
  }, [router.pathname]);

  async function logout() {
    try {
      await api("/api/auth/logout", { method: "POST" });
    } catch {
      /* cookie might already be gone */
    }
    localStorage.removeItem(MOBILE_TOKEN_KEY);
    setUser(null);
    router.replace("/login");
  }

  const role = user?.role;

  return (
    <nav className="nav">
      <Link className="brand" href="/">
        <span className="logo">🎓</span>
        <span>edu-mvp</span>
      </Link>
      <div className="links">
        <Link className="link" href="/dashboard">لوحة التحكم</Link>
        {role !== "parent" && <Link className="link" href="/library">المكتبة</Link>}
        {role === "admin" && <Link className="link" href="/upload">رفع كتاب</Link>}
        {user ? (
          <>
            <span className="link" style={{ color: "var(--primary-dark)", fontWeight: 700, cursor: "default" }}>
              {user.name || user.email}
            </span>
            <button className="btn secondary" style={{ padding: "7px 16px", fontSize: 14 }} onClick={logout}>
              خروج
            </button>
          </>
        ) : (
          <>
            <Link className="link" href="/login-qr">QR</Link>
            <Link className="btn" style={{ padding: "7px 16px", fontSize: 14 }} href="/login">دخول</Link>
          </>
        )}
      </div>
    </nav>
  );
}
