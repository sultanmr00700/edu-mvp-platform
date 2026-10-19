import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import Nav from "../components/Nav";
import { api, User } from "../lib/api";

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

  if (loading) {
    return (
      <>
        <Nav />
        <div className="container"><p className="muted">جاري التحميل...</p></div>
      </>
    );
  }

  return (
    <>
      <Nav />
      <div className="container">
        <div className="card fade-up">
          <h1>لوحة التحكم 👋</h1>
          {user && (
            <>
              <p style={{ fontWeight: 700 }}>{user.name || "بدون اسم"} — <span className="muted" style={{ fontWeight: 400 }}>{user.email}</span></p>
              <p style={{ marginTop: 6 }}>
                <span className="badge confirmed"><span className="dot" />الدور: {user.role}</span>
              </p>
            </>
          )}
        </div>

        <div className="grid">
          <div className="card book-card fade-up d1">
            <div className="icon-tile tile-indigo">📚</div>
            <Link href="/library">المكتبة</Link>
            <p className="muted">كل الكتب المرفوعة — اقرأ أي كتاب في قارئ مدمج.</p>
            <Link className="btn secondary" href="/library">افتح المكتبة</Link>
          </div>
          <div className="card book-card fade-up d2">
            <div className="icon-tile tile-amber">⬆️</div>
            <Link href="/upload">رفع كتاب</Link>
            <p className="muted">ارفع ملف PDF جديد وأضفه للمكتبة فورًا.</p>
            <Link className="btn" href="/upload">ارفع الآن</Link>
          </div>
          <div className="card book-card fade-up d3">
            <div className="icon-tile tile-emerald">🔐</div>
            <Link href="/login-qr">الدخول بـ QR</Link>
            <p className="muted">جرّب تدفق مسح الـ QR من الموبايل.</p>
            <Link className="btn secondary" href="/login-qr">جرّب الآن</Link>
          </div>
        </div>
      </div>
    </>
  );
}
