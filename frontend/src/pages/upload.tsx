import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import Nav from "../components/Nav";
import { api, Book } from "../lib/api";

export default function UploadPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState<Book | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCreated(null);
    if (!file) {
      setError("اختار ملف PDF الأول");
      return;
    }
    setLoading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      if (title.trim()) form.append("title", title.trim());
      const data = await api<{ book: Book }>("/api/books/upload", { method: "POST", body: form });
      setCreated(data.book);
      setFile(null);
      setTitle("");
    } catch (err) {
      if (err instanceof Error && err.message === "unauthorized") {
        router.replace("/login");
        return;
      }
      setError(err instanceof Error && err.message === "only_pdf_allowed" ? "الملف لازم يكون PDF فقط" : "الرفع فشل — جرّب تاني");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Nav />
      <div className="container" style={{ maxWidth: 560 }}>
        <div className="card fade-up">
          <h1>⬆️ رفع كتاب PDF</h1>
          {error && <div className="error">{error}</div>}
          {created && (
            <div className="success">
              تم رفع «{created.title}» بنجاح ✓{" "}
              <Link href={`/books/${created.id}`} style={{ fontWeight: 700 }}>افتح الكتاب ←</Link>
            </div>
          )}
          <form onSubmit={onSubmit}>
            <div className="field">
              <label>عنوان الكتاب (اختياري)</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="مثال: كتاب الرياضيات"
              />
            </div>
            <div className="field">
              <label>ملف PDF</label>
              <input
                type="file"
                accept="application/pdf,.pdf"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                required
              />
              <p className="file-hint">
                {file ? `📎 المختار: ${file.name}` : "الحد الأقصى 25MB — هيتحفظ في backend/uploads"}
              </p>
            </div>
            <button className="btn lg" type="submit" disabled={loading} style={{ width: "100%" }}>
              {loading ? "جاري الرفع..." : "ارفع الكتاب"}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
