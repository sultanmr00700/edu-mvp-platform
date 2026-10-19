import React, { useEffect, useState } from "react";
import Link from "next/link";
import { api, User } from "../lib/api";

export default function HomePage() {
  const [user, setUser] = useState<User | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    api<{ user: User }>("/api/me")
      .then((d) => setUser(d.user))
      .catch(() => setUser(null))
      .finally(() => setChecked(true));
  }, []);

  return (
    <div className="container">
      <div className="card">
        <h1>🎓 منصة edu-mvp التعليمية</h1>
        <p className="muted">
          MVP بسيط: تسجيل دخول بالإيميل أو بـ QR، رفع كتب PDF، قراءتها، واستخراج نص
          لاحقًا لتوليد امتحانات.
        </p>
      </div>

      <div className="card">
        {checked && user ? (
          <div>
            <h2>أهلًا {user.name || user.email} 👋</h2>
            <p className="muted">دورك: {user.role}</p>
            <div className="row" style={{ marginTop: 12 }}>
              <Link className="btn" href="/dashboard">الذهاب للوحة التحكم</Link>
              <Link className="btn secondary" href="/library">المكتبة</Link>
            </div>
          </div>
        ) : (
          <div className="row">
            <Link className="btn" href="/login">تسجيل الدخول</Link>
            <Link className="btn secondary" href="/login-qr">دخول بـ QR</Link>
          </div>
        )}
      </div>
    </div>
  );
}
