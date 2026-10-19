import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { api, MOBILE_TOKEN_KEY, User } from "../lib/api";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<{ user: User }>("/api/me")
      .then((d) => setUser(d.user))
      .catch(() => router.replace("/login"))
      .finally(() => setLoading(false));
  }, [router]);

  async function logout() {
    try {
      await api("/api/auth/logout", { method: "POST" });
    } catch {
      /* cookie might already be gone */
    }
    localStorage.removeItem(MOBILE_TOKEN_KEY);
    router.replace("/login");
  }

  if (loading) return <div className="container"><p className="muted">جاري التحميل...</p></div>;

  return (
    <div className="container">
      <div className="card">
        <h1>لوحة التحكم</h1>
        {user && (
          <>
            <p>
              <strong>{user.name || "بدون اسم"}</strong> — {user.email}
            </p>
            <p className="muted">الدور: {user.role}</p>
          </>
        )}
      </div>

      <div className="grid">
        <div className="card book-card">
          <h2>📚 المكتبة</h2>
          <p className="muted">كل الكتب المرفوعة</p>
          <Link className="btn" href="/library">افتح المكتبة</Link>
        </div>
        <div className="card book-card">
          <h2>⬆️ رفع كتاب</h2>
          <p className="muted">ارفع ملف PDF جديد</p>
          <Link className="btn" href="/upload">ارفع الآن</Link>
        </div>
        <div className="card book-card">
          <h2>🔐 تسجيل خروج</h2>
          <p className="muted">إنهاء الجلسة الحالية</p>
          <button className="btn secondary" onClick={logout}>خروج</button>
        </div>
      </div>
    </div>
  );
}
