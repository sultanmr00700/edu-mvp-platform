import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { API_URL, api, Book } from "../../lib/api";

export default function BookReaderPage() {
  const router = useRouter();
  const id = Array.isArray(router.query.id) ? router.query.id[0] : router.query.id;
  const [book, setBook] = useState<Book | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [processMsg, setProcessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    api<{ book: Book }>(`/api/books/${id}`)
      .then((d) => setBook(d.book))
      .catch((err) => {
        if (err instanceof Error && err.message === "unauthorized") {
          router.replace("/login");
          return;
        }
        setError("الكتاب غير موجود");
      });
  }, [id, router]);

  async function startProcessing() {
    if (!book) return;
    setProcessing(true);
    setProcessMsg(null);
    try {
      await api(`/api/books/${book.id}/process`, { method: "POST" });
      setProcessMsg("تم إرسال الكتاب لطابور المعالجة (استخراج النص) ✓");
    } catch (err) {
      setProcessMsg(
        err instanceof Error && err.message === "queue_unavailable"
          ? "طابور المعالجة (Redis) غير متاح حاليًا"
          : "بدأ المعالجة فشل"
      );
    } finally {
      setProcessing(false);
    }
  }

  if (error) {
    return (
      <div className="container">
        <div className="card">
          <h1>مفيش كتاب</h1>
          <p className="error">{error}</p>
          <Link className="btn" href="/library">رجوع للمكتبة</Link>
        </div>
      </div>
    );
  }

  if (!book) {
    return <div className="container"><p className="muted">جاري التحميل...</p></div>;
  }

  return (
    <div className="container" style={{ maxWidth: 1040 }}>
      <div className="card">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <div>
            <h1 style={{ marginBottom: 4 }}>{book.title}</h1>
            <span className="muted">أُضيف: {new Date(book.createdAt).toLocaleDateString("ar-EG")}</span>
          </div>
          <div className="row">
            <button className="btn secondary" onClick={startProcessing} disabled={processing}>
              {processing ? "جاري الإرسال..." : "ابدأ استخراج النص"}
            </button>
            <Link className="btn secondary" href="/library">رجوع</Link>
          </div>
        </div>
        {processMsg && <p className="muted" style={{ marginTop: 8 }}>{processMsg}</p>}
      </div>

      <iframe
        className="reader"
        title={book.title}
        src={`${API_URL}${book.pdfUrl}`}
      />
    </div>
  );
}
