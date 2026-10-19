import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
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
    <div className="container">
      <div className="card">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <h1 style={{ marginBottom: 0 }}>📚 المكتبة</h1>
          <Link className="btn" href="/upload">+ رفع كتاب</Link>
        </div>
      </div>

      {loading && <p className="muted">جاري تحميل الكتب...</p>}

      {!loading && books.length === 0 && (
        <div className="card">
          <p>المكتبة فاضية — ارفع أول كتاب PDF من <Link href="/upload">هنا</Link>.</p>
        </div>
      )}

      <div className="grid">
        {books.map((b) => (
          <div className="card book-card" key={b.id}>
            <Link href={`/books/${b.id}`}>{b.title}</Link>
            <span className="muted">أُضيف: {new Date(b.createdAt).toLocaleDateString("ar-EG")}</span>
            <span className={`badge ${b.textExtracted ? "confirmed" : "pending"}`}>
              {b.textExtracted ? "النص مستخرج" : "النص لم يستخرج"}
            </span>
            {b.uploadedBy?.name && <span className="muted">بواسطة: {b.uploadedBy.name}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
