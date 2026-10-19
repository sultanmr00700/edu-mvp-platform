import React, { useEffect, useState } from "react";
import Link from "next/link";
import { api, AdminStats, Book } from "../../lib/api";

/**
 * واجهة الأدمن: إحصائيات + إدارة الكتب (رفع/مكتبة)
 */
export default function AdminDashboard({ userName }: { userName: string | null }) {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [books, setBooks] = useState<Book[]>([]);

  useEffect(() => {
    api<AdminStats>("/api/admin/stats").then(setStats).catch(() => setStats(null));
    api<{ books: Book[] }>("/api/books").then((d) => setBooks(d.books)).catch(() => setBooks([]));
  }, []);

  return (
    <>
      <div className="card fade-up">
        <div className="page-title">
          <div>
            <h1 style={{ marginBottom: 4 }}>لوحة الإدارة 🛠️</h1>
            <p className="muted" style={{ margin: 0 }}>مرحبًا {userName || ""} — إدارة الكتب والمستخدمين من هنا.</p>
          </div>
          <Link className="btn" href="/upload">⬆️ رفع كتاب</Link>
        </div>
      </div>

      <div className="grid fade-up d1">
        <div className="card stat-card">
          <div className="icon-tile tile-indigo" style={{ margin: 0 }}>👥</div>
          <span className="stat-num">{stats?.users ?? "—"}</span>
          <span className="muted">مستخدم</span>
        </div>
        <div className="card stat-card">
          <div className="icon-tile tile-emerald" style={{ margin: 0 }}>🎓</div>
          <span className="stat-num">{stats?.students ?? "—"}</span>
          <span className="muted">طالب</span>
        </div>
        <div className="card stat-card">
          <div className="icon-tile tile-amber" style={{ margin: 0 }}>👨‍👩‍👦</div>
          <span className="stat-num">{stats?.parents ?? "—"}</span>
          <span className="muted">ولي أمر</span>
        </div>
        <div className="card stat-card">
          <div className="icon-tile tile-rose" style={{ margin: 0 }}>📚</div>
          <span className="stat-num">{stats?.books ?? "—"}</span>
          <span className="muted">كتاب</span>
        </div>
        <div className="card stat-card">
          <div className="icon-tile tile-indigo" style={{ margin: 0 }}>📝</div>
          <span className="stat-num">{stats?.exams ?? "—"}</span>
          <span className="muted">نموذج امتحان</span>
        </div>
      </div>

      <div className="card fade-up d2">
        <div className="page-title">
          <h2 style={{ marginBottom: 0, fontSize: 18 }}>📚 أحدث الكتب المرفوعة</h2>
          <Link className="btn secondary" href="/library">كل المكتبة</Link>
        </div>
        {books.length === 0 ? (
          <p className="muted" style={{ margin: "12px 0 0" }}>لسه مفيش كتب — ارفع أول كتاب PDF.</p>
        ) : (
          <ul className="admin-books">
            {books.slice(0, 5).map((b) => (
              <li key={b.id}>
                <Link href={`/books/${b.id}`}>{b.title}</Link>
                <span className="muted"> · {new Date(b.createdAt).toLocaleDateString("ar-EG")}</span>
                <span className={`badge ${b.textExtracted ? "confirmed" : "pending"}`} style={{ marginInlineStart: 10 }}>
                  <span className="dot" />
                  {b.textExtracted ? "النص مستخرج" : "بانتظار الاستخراج"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
