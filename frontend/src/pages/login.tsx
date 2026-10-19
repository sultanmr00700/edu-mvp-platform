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
    <div className="container" style={{ maxWidth: 440 }}>
      <div className="card">
        <h1>تسجيل الدخول</h1>
        {error && <div className="error">{error}</div>}
        <form onSubmit={onSubmit}>
          <div className="field">
            <label>الإيميل</label>
            <input
              type="email"
              dir="ltr"
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
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button className="btn" type="submit" disabled={loading}>
            {loading ? "جاري الدخول..." : "دخول"}
          </button>
        </form>
        <p className="muted" style={{ marginTop: 12 }}>
          أو جرّب <Link href="/login-qr">الدخول بـ QR</Link> ·
          {" "}ما عندكش حساب؟ سجّل من الـ API (شوف الـ README)
        </p>
      </div>
    </div>
  );
}
