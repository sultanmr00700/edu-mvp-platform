import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import Nav from "../components/Nav";
import { api, Book } from "../lib/api";

export default function LibraryPage() {
  const router = useRouter();
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<{ books: Book[] }>("/api/books")
      .then((d) => setBooks(d.books))
      .catch((err) => {
        if (err instanceof Error && err.message === "unauthorized") {
          router.replace("/login");
        }
      })
      .finally(() => setLoading(false));
  }, [router]);

  return (
    <>
      <Nav />
      <div className="container">
        <div className="card fade-up">
          <div className="page-title">
            <h1 style={{ marginBottom: 0 }}>📚 المكتبة</h1>
            <Link className="btn" href="/upload">+ رفع كتاب</Link>
          </div>
        </div>

        {loading && <p className="muted">جاري تحميل الكتب...</p>}

        {!loading && books.length === 0 && (
          <div className="card fade-up" style={{ textAlign: "center", padding: 48 }}>
            <div className="icon-tile tile-indigo" style={{ margin: "0 auto 14px" }}>📭</div>
            <p style={{ fontWeight: 700, marginBottom: 10 }}>المكتبة فاضية لسه</p>
            <p className="muted" style={{ marginBottom: 16 }}>ارفع أول كتاب PDF عشان يظهر هنا.</p>
            <Link className="btn" href="/upload">ارفع أول كتاب</Link>
          </div>
        )}

        <div className="grid">
          {books.map((b, i) => (
            <div className="card book-card fade-up" key={b.id} style={{ animationDelay: `${Math.min(i, 5) * 0.06}s` }}>
              <div className={`icon-tile ${i % 3 === 1 ? "tile-amber" : i % 3 === 2 ? "tile-emerald" : "tile-indigo"}`}>📖</div>
              <Link href={`/books/${b.id}`}>{b.title}</Link>
              <span className="muted">أُضيف: {new Date(b.createdAt).toLocaleDateString("ar-EG")}</span>
              <span className={`badge ${b.textExtracted ? "confirmed" : "pending"}`}>
                <span className="dot" />
                {b.textExtracted ? "النص مستخرج" : "النص لم يستخرج"}
              </span>
              {b.uploadedBy?.name && <span className="muted">بواسطة: {b.uploadedBy.name}</span>}
              <Link className="btn secondary" href={`/books/${b.id}`}>اقرأ الآن ←</Link>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
