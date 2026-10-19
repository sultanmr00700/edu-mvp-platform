import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { api, MOBILE_TOKEN_KEY, User } from "../lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const data = await api<{ token: string; user: User }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      // Keep the "mobile JWT" locally — used by the /login-qr page to confirm a QR.
      localStorage.setItem(MOBILE_TOKEN_KEY, data.token);
      router.push("/dashboard");
    } catch (err) {
      setError(
        err instanceof Error && err.message === "invalid_credentials"
          ? "الإيميل أو كلمة السر غلط 🤔"
          : "حصلت مشكلة في الاتصال بالسيرفر"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-shell fade-up">
      <aside className="auth-side">
        <h2>أهلًا بيك تاني 👋</h2>
        <p>سجّل دخولك عشان توصل مكتبتك وكتبك في ثانية.</p>
        <ul className="side-points">
          <li>🔒 باسورداتك مشفّرة (bcrypt)</li>
          <li>⚡ جلسة سريعة لمدة ساعة</li>
          <li>📱 أو ادخل بـ QR من الموبايل</li>
        </ul>
      </aside>

      <main className="auth-main">
        <h1 style={{ fontSize: 26, marginBottom: 6 }}>تسجيل الدخول</h1>
        <p className="muted" style={{ marginBottom: 20 }}>
          مفيش حسّ؟ ارجع للـ API وسجّل واحد جديد (شوف الـ README)
        </p>

        {error && <div className="error">{error}</div>}

        <form onSubmit={onSubmit}>
          <div className="field">
            <label>الإيميل</label>
            <input
              type="email"
              dir="ltr"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label>كلمة السر</label>
            <input
              type="password"
              dir="ltr"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button className="btn lg" type="submit" disabled={loading} style={{ width: "100%" }}>
            {loading ? "جاري الدخول..." : "دخول"}
          </button>
        </form>

        <p className="muted" style={{ marginTop: 16, textAlign: "center" }}>
          أو جرّب <Link href="/login-qr" style={{ color: "var(--primary-dark)", fontWeight: 700 }}>الدخول بـ QR</Link>
        </p>
      </main>
    </div>
  );
}
