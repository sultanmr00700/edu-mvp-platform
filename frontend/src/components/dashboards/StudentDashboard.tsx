import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api, StudentOverview } from "../../lib/api";
import { STAGE_LABEL, TERM_LABEL, scoreClass, scoreLabel } from "../../lib/labels";

/**
 * واجهة الطالب: المرحلة التعليمية + الفصل + المواد + الاختبارات + نماذج الامتحانات
 */
export default function StudentDashboard({ userName }: { userName: string | null }) {
  const [data, setData] = useState<StudentOverview | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Profile completion form
  const [stage, setStage] = useState("");
  const [term, setTerm] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    api<StudentOverview>("/api/student/overview")
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : "load_failed"));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!stage || !term) return;
    setSaving(true);
    try {
      await api("/api/profile", { method: "PUT", body: JSON.stringify({ stage, term }) });
      load();
    } catch {
      setError("تعذر حفظ الملف الدراسي");
    } finally {
      setSaving(false);
    }
  }

  if (error) return <div className="error">حصلت مشكلة: {error}</div>;
  if (!data) return <p className="muted">جاري تحميل لوحة الطالب...</p>;

  const needsProfile = !data.profile?.stage || !data.profile?.term;

  return (
    <>
      <div className="card fade-up">
        <div className="page-title">
          <div>
            <h1 style={{ marginBottom: 4 }}>مرحبًا {userName || "بك"} 👋</h1>
            <p className="muted" style={{ margin: 0 }}>ده مكانك كطالب — اختار موادك وتابع اختباراتك.</p>
          </div>
          {!needsProfile && (
            <div className="row">
              <span className="chip chip-indigo">🎓 {STAGE_LABEL[data.profile!.stage!]}</span>
              <span className="chip chip-amber">📅 {TERM_LABEL[data.profile!.term!]}</span>
            </div>
          )}
        </div>
      </div>

      {needsProfile && (
        <div className="card fade-up d1">
          <h2 style={{ fontSize: 18 }}>📋 كمّل ملفك الدراسي الأول</h2>
          <p className="muted">اختار المرحلة التعليمية والفصل عشان نعرضلك موادك ونماذج الامتحانات.</p>
          <form onSubmit={saveProfile} className="row" style={{ alignItems: "flex-end", gap: 14 }}>
            <div className="field" style={{ flex: 1, minWidth: 200, marginBottom: 0 }}>
              <label>المرحلة التعليمية</label>
              <select value={stage} onChange={(e) => setStage(e.target.value)} required>
                <option value="">— اختار المرحلة —</option>
                <option value="primary">المرحلة الابتدائية</option>
                <option value="prep">المرحلة الإعدادية</option>
                <option value="secondary">المرحلة الثانوية</option>
              </select>
            </div>
            <div className="field" style={{ flex: 1, minWidth: 200, marginBottom: 0 }}>
              <label>الفصل الدراسي</label>
              <select value={term} onChange={(e) => setTerm(e.target.value)} required>
                <option value="">— اختار الفصل —</option>
                <option value="term1">الفصل الدراسي الأول</option>
                <option value="term2">الفصل الدراسي الثاني</option>
              </select>
            </div>
            <button className="btn" type="submit" disabled={saving}>
              {saving ? "جاري الحفظ..." : "حفظ"}
            </button>
          </form>
        </div>
      )}

      {!needsProfile && (
        <>
          <h2 className="section-title fade-up d1">📚 موادك الدراسية</h2>
          <div className="grid fade-up d1">
            {data.subjects.map((s) => (
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

          <h2 className="section-title fade-up d2">📝 آخر اختباراتك</h2>
          {data.attempts.length === 0 ? (
            <div className="card fade-up d2">
              <p className="muted" style={{ margin: 0 }}>لسه مفيش اختبارات — حل نموذج من نماذج الامتحانات تحت 🔽</p>
            </div>
          ) : (
            <div className="card fade-up d2" style={{ padding: 0 }}>
              <table className="table">
                <thead>
                  <tr><th>الاختبار</th><th>المادة</th><th>النتيجة</th><th>التاريخ</th></tr>
                </thead>
                <tbody>
                  {data.attempts.map((a) => (
                    <tr key={a.id}>
                      <td>{a.examTitle}</td>
                      <td>{a.subjectEmoji} {a.subjectName ?? "—"}</td>
                      <td><span className={`score-pill ${scoreClass(a.score)}`}>{scoreLabel(a.score)}</span></td>
                      <td className="muted">{new Date(a.date).toLocaleDateString("ar-EG")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <h2 className="section-title fade-up d3">🗂️ نماذج الامتحانات</h2>
          <div className="grid fade-up d3">
            {data.templates.map((t) => (
              <div className="card book-card" key={t.id}>
                <div className="icon-tile tile-amber">📝</div>
                <span style={{ fontWeight: 800 }}>{t.title}</span>
                <span className="chip chip-indigo" style={{ fontSize: 12 }}>{t.subjectEmoji} {t.subjectName ?? ""}</span>
              </div>
            ))}
          </div>
        </>
      )}

      <p className="muted fade-up d3" style={{ textAlign: "center", marginTop: 22 }}>
        كمان تقدر تقرأ كتب المكتبة من <Link href="/library" style={{ color: "var(--primary-dark)", fontWeight: 700 }}>هنا</Link> 📚
      </p>
    </>
  );
}
