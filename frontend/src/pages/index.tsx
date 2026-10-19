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
    <>
      <nav className="nav">
        <Link className="brand" href="/">
          <span className="logo">🎓</span>
          <span>edu-mvp</span>
        </Link>
        <div className="links">
          {checked && user ? (
            <>
              <Link className="link" href="/dashboard">لوحة التحكم</Link>
              <Link className="link" href="/library">المكتبة</Link>
            </>
          ) : (
            <>
              <Link className="link" href="/login">دخول</Link>
              <Link className="link" href="/login-qr">QR</Link>
            </>
          )}
        </div>
      </nav>

      <div className="container">
        <section className="hero fade-up">
          <span className="float-shape s1" />
          <span className="float-shape s2" />
          <span className="float-shape s3" />

          <div className="hero-badge">✨ MVP جديد — ادخل بـ QR من موبايلك</div>
          <h1>
            كتبك وامتحاناتك
            <br />
            <span className="grad-text">كلها في مكان واحد</span>
          </h1>
          <p>
            ارفع كتب PDF، اقرأها في المتصفح، وادخل بمسحة QR واحدة —
            منصة تعليمية بسيطة وسريعة لطلاب وأولياء الأمور والمدرسين.
          </p>
          <div className="row" style={{ justifyContent: "center" }}>
            <Link className="btn lg" href={user ? "/dashboard" : "/login"}>
              {user ? "لوحة التحكم" : "ابدأ الآن"}
            </Link>
            <Link className="btn secondary lg" href="/login-qr">
              دخول بـ QR
            </Link>
          </div>
        </section>

        <section className="grid">
          <div className="card feature fade-up d1">
            <div className="icon-tile tile-indigo">📚</div>
            <h2 style={{ fontSize: 18 }}>مكتبة رقمية</h2>
            <p className="muted">ارفع أي PDF وافتحه في قارئ مدمج — من الموبايل أو الكمبيوتر.</p>
          </div>
          <div className="card feature fade-up d2">
            <div className="icon-tile tile-amber">🔐</div>
            <h2 style={{ fontSize: 18 }}>دخول بـ QR</h2>
            <p className="muted">امسح الكود من موبايلك المسجّل دخول — بدون كتابة باسورد تاني.</p>
          </div>
          <div className="card feature fade-up d3">
            <div className="icon-tile tile-emerald">🧠</div>
            <h2 style={{ fontSize: 18 }}>امتحانات ذكية</h2>
            <p className="muted">استخراج النص من الكتاب وتوليد أسئلة تلقائيًا (قريبًا).</p>
          </div>
        </section>
      </div>
    </>
  );
}
