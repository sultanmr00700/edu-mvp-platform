import React, { useEffect, useState } from 'react';
import QRCode from 'react-qr-code';

export default function LoginQRPage() {
  const [token, setToken] = useState<string | null>(null);
  const [status, setStatus] = useState('pending');
  useEffect(() => {
    const createQr = async () => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/qr/create`, { method: 'POST' });
      const data = await res.json();
      setToken(data.token);
    };
    createQr();
  }, []);

  useEffect(() => {
    let iv: any;
    if (token) {
      iv = setInterval(async () => {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/qr/status?token=${token}`);
        const data = await res.json();
        setStatus(data.status || 'pending');
        if (data.status === 'confirmed') {
          clearInterval(iv);
          // handle success (set cookie / redirect)
          alert('تم تسجيل الدخول بنجاح');
          window.location.href = '/';
        }
      }, 1500);
    }
    return () => clearInterval(iv);
  }, [token]);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <h2>سجل دخول عن طريق المسح QR</h2>
        {token ? (
          <div style={{ background: 'white', padding: 16, display: 'inline-block' }}>
            <QRCode value={token} size={200} />
          </div>
        ) : (
          <p>جاري إنشاء QR...</p>
        )}
        <p>الحالة: {status}</p>
      </div>
    </div>
  );
}
