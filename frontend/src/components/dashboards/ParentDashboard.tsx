import React, { useEffect, useState } from "react";
import { api, Child } from "../../lib/api";
import { scoreClass, scoreLabel } from "../../lib/labels";

/**
 * واجهة ولي الأمر: أبناؤه + نتائجهم + التوصيات
 */
export default function ParentDashboard({ userName }: { userName: string | null }) {
  const [children, setChildren] = useState<Child[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<{ children: Child[] }>("/api/parent/children")
      .then((d) => setChildren(d.children))
      .catch((e) => setError(e instanceof Error ? e.message : "load_failed"));
  }, []);

  if (error) return <div className="error">حصلت مشكلة: {error}</div>;
  if (!children) return <p className="muted">جاري تحميل بيانات الأبناء...</p>;

  return (
    <>
      <div className="card fade-up">
        <h1 style={{ marginBottom: 4 }}>مرحبًا {userName || "بك"} 👋</h1>
        <p className="muted" style={{ margin: 0 }}>
          من هنا تتابع نتائج أبنائك وتوصيات المتابعة الخاصة بهم.
        </p>
      </div>

      {children.length === 0 && (
        <div className="card fade-up d1" style={{ textAlign: "center", padding: 42 }}>
          <div className="icon-tile tile-amber" style={{ margin: "0 auto 14px" }}>👨‍👩‍👦</div>
          <p style={{ fontWeight: 700, marginBottom: 8 }}>مفيش أبناء مرتبطين بحسابك لسه</p>
          <p className="muted">تواصل مع إدارة المدرسة لربط حساب طفلك بحسابك.</p>
        </div>
      )}

      {children.map((child, idx) => (
        <div key={child.id} className={`fade-up d${Math.min(idx + 1, 3)}`}>
          <div className="card">
            <div className="page-title">
              <div>
                <h2 style={{ marginBottom: 4 }}>👦 {child.name || child.email}</h2>
                <p className="muted" style={{ margin: 0 }}>
                  {child.profile.stageName} · {child.profile.termName}
                </p>
              </div>
              {child.average != null && (
                <div className="avatar-score">
                  <span className={`score-pill lg ${scoreClass(child.average)}`}>{scoreLabel(child.average)}</span>
                  <span className="muted" style={{ fontSize: 12 }}>المعدل العام</span>
                </div>
              )}
            </div>
          </div>

          <div className="grid">
            {child.subjects.map((s) => (
              <div className="card subject-card" key={s.id}>
                <div className="row" style={{ justifyContent: "space-between" }}>
                  <div className="row" style={{ gap: 10 }}>
                    <div className="icon-tile tile-indigo" style={{ margin: 0, width: 44, height: 44, fontSize: 21 }}>{s.emoji}</div>
                    <span style={{ fontWeight: 800 }}>{s.name}</span>
                  </div>
                  <span className={`score-pill ${scoreClass(s.score)}`}>{scoreLabel(s.score)}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="card">
            <h2 style={{ fontSize: 18 }}>📊 آخر النتائج</h2>
            {child.results.length === 0 ? (
              <p className="muted" style={{ margin: 0 }}>لسه مفيش نتائج مسجلة.</p>
            ) : (
              <table className="table">
                <thead>
                  <tr><th>الاختبار</th><th>المادة</th><th>النتيجة</th><th>التاريخ</th></tr>
                </thead>
                <tbody>
                  {child.results.map((r) => (
                    <tr key={r.id}>
                      <td>{r.examTitle}</td>
                      <td>{r.subjectEmoji} {r.subjectName ?? "—"}</td>
                      <td><span className={`score-pill ${scoreClass(r.score)}`}>{scoreLabel(r.score)}</span></td>
                      <td className="muted">{new Date(r.date).toLocaleDateString("ar-EG")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="card">
            <h2 style={{ fontSize: 18 }}>💡 توصيات المتابعة</h2>
            <ul className="reco-list">
              {child.recommendations.length === 0 && (
                <li className="muted">اتعمل توصيات بعد تسجيل أول اختبار.</li>
              )}
              {child.recommendations.map((r) => (
                <li key={r.subjectId} className={`reco reco-${r.level}`}>
                  <span className="reco-icon">{r.level === "strong" ? "🌟" : r.level === "good" ? "👍" : "📌"}</span>
                  {r.text}
                </li>
              ))}
            </ul>
          </div>
        </div>
      ))}
    </>
  );
}
