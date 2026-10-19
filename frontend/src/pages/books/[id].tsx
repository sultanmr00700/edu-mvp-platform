import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import Nav from "../../components/Nav";
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
          : "ابدأ المعالجة فشل"
      );
    } finally {
      setProcessing(false);
    }
  }

  if (error) {
    return (
      <>
        <Nav />
        <div className="container" style={{ maxWidth: 560 }}>
          <div className="card fade-up" style={{ textAlign: "center", padding: 44 }}>
            <div className="icon-tile tile-rose" style={{ margin: "0 auto 14px" }}>😕</div>
            <h1 style={{ fontSize: 22 }}>مفيش كتاب</h1>
            <p className="error" style={{ display: "inline-block" }}>{error}</p>
            <div><Link className="btn" href="/library">رجوع للمكتبة</Link></div>
          </div>
        </div>
      </>
    );
  }

  if (!book) {
    return (
      <>
        <Nav />
        <div className="container"><p className="muted">جاري التحميل...</p></div>
      </>
    );
  }

  return (
    <>
      <Nav />
      <div className="container" style={{ maxWidth: 1060 }}>
        <div className="card reader-toolbar fade-up">
          <div>
            <h1>📖 {book.title}</h1>
            <span className="muted">أُضيف: {new Date(book.createdAt).toLocaleDateString("ar-EG")}</span>
          </div>
          <div className="row">
            <button
              className="btn secondary"
              onClick={startProcessing}
              disabled={processing}
              style={{ background: "rgba(255,255,255,.12)", color: "#fff", borderColor: "rgba(255,255,255,.25)" }}
            >
              {processing ? "جاري الإرسال..." : "🧠 ابدأ استخراج النص"}
            </button>
            <Link
              className="btn secondary"
              href="/library"
              style={{ background: "rgba(255,255,255,.12)", color: "#fff", borderColor: "rgba(255,255,255,.25)" }}
            >
              رجوع
            </Link>
          </div>
        </div>
        {processMsg && <p className="muted" style={{ margin: "-6px 4px 12px" }}>{processMsg}</p>}

        <iframe
          className="reader fade-up d1"
          title={book.title}
          src={`${API_URL}${book.pdfUrl}`}
        />
      </div>
    </>
  );
}
