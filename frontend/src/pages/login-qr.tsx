import React, { useCallback, useEffect, useRef, useState } from "react";
import QRCode from "react-qr-code";
import { useRouter } from "next/router";
import Nav from "../components/Nav";
import { api, MOBILE_TOKEN_KEY } from "../lib/api";

type Status = "pending" | "confirmed" | "expired" | "not_found";

const POLL_MS = 1500;

export default function LoginQrPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("pending");
  const [error, setError] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(120);
  const [confirming, setConfirming] = useState(false);
  const tokenRef = useRef<string | null>(null);

  const createQr = useCallback(async () => {
    setError(null);
    setStatus("pending");
    setToken(null);
    try {
      const data = await api<{ token: string; expiresAt: string }>("/api/auth/qr/create", {
        method: "POST",
      });
      setToken(data.token);
      tokenRef.current = data.token;
      setSecondsLeft(Math.max(0, Math.round((new Date(data.expiresAt).getTime() - Date.now()) / 1000)));
    } catch {
      setError("تعذر إنشاء الـ QR. اتأكد إن السيرفر شغال.");
    }
  }, []);

  useEffect(() => {
    createQr();
  }, [createQr]);

  // Poll the status of the displayed QR token.
  useEffect(() => {
    if (!token) return;
    const iv = setInterval(async () => {
      try {
        const data = await api<{ status: Status }>(`/api/auth/qr/status?token=${token}`);
        setStatus(data.status);
        if (data.status === "confirmed") {
          clearInterval(iv);
          setTimeout(() => router.push("/dashboard"), 400);
        }
      } catch {
        /* keep polling quietly */
      }
    }, POLL_MS);
    return () => clearInterval(iv);
  }, [token, router]);

  // Countdown until the QR expires.
  useEffect(() => {
    if (!token || status !== "pending") return;
    const iv = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(iv);
          setStatus("expired");
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [token, status]);

  // Simulated phone: confirm the QR with the mobile JWT saved on /login.
  async function simulateMobileConfirm() {
    if (!token) return;
    const mobileToken = localStorage.getItem(MOBILE_TOKEN_KEY);
    if (!mobileToken) {
      setError("مفيش token موبايل محفوظ — سجّل دخول من صفحة /login الأول (أو استخدم curl زي الـ README).");
      return;
    }
    setConfirming(true);
    setError(null);
    try {
      await api("/api/auth/qr/confirm", {
        method: "POST",
        headers: { Authorization: `Bearer ${mobileToken}` },
        body: JSON.stringify({ token }),
      });
      setStatus("confirmed");
      setTimeout(() => router.push("/dashboard"), 400);
    } catch (err) {
      setError(
        err instanceof Error
          ? `التأكيد فشل: ${err.message}`
          : "التأكيد فشل"
      );
    } finally {
      setConfirming(false);
    }
  }

  return (
    <>
      <Nav />
      <div className="container" style={{ maxWidth: 560 }}>
        <div className="card fade-up" style={{ textAlign: "center", padding: "34px 28px" }}>
          <h1 style={{ marginBottom: 6 }}>الدخول بـ QR 🔐</h1>
          <p className="muted" style={{ marginBottom: 4 }}>
            افتح التطبيق على الموبايل المسجّل دخول، امسح الكود، ووافق على الدخول.
          </p>

          {error && <div className="error" style={{ textAlign: "right", marginTop: 14 }}>{error}</div>}

          {token && status === "pending" && (
            <div className="qr-wrap">
              <div className="qr-box">
                <QRCode value={token} size={208} />
              </div>
            </div>
          )}

          {status === "expired" && (
            <div className="error">انتهت صلاحية الكود (دقيقتين) ⏰ — اعمل كود جديد.</div>
          )}
          {status === "not_found" && <div className="error">الكود غير موجود.</div>}
          {status === "confirmed" && <div className="success">تم التأكيد ✓ جاري التحويل للوحة التحكم...</div>}

          <p style={{ margin: "14px 0" }}>
            <span className={`badge ${status}`}>
              <span className="dot" />
              {status === "pending" ? "في انتظار التأكيد" : status === "confirmed" ? "تم التأكيد" : "منتهي الصلاحية"}
            </span>
            {status === "pending" && (
              <span className="muted"> · متبقّي <span className="countdown">{secondsLeft}</span> ثانية</span>
            )}
          </p>

          <div className="row" style={{ justifyContent: "center" }}>
            {status === "pending" && (
              <button className="btn secondary" onClick={simulateMobileConfirm} disabled={confirming}>
                {confirming ? "جاري التأكيد..." : "📱 تأكيد من الموبايل (تجريبي)"}
              </button>
            )}
            <button className="btn" onClick={createQr} disabled={status === "pending" && secondsLeft > 0}>
              إنشاء QR جديد
            </button>
          </div>

          <p className="muted" style={{ marginTop: 16 }}>
            للتجربة بـ curl: استخدم أمر <code>qr/confirm</code> من الـ README بـ Bearer token الموبايل.
          </p>
        </div>
      </div>
    </>
  );
}
