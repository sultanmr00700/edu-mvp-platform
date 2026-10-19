import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Nav from "../components/Nav";
import StudentDashboard from "../components/dashboards/StudentDashboard";
import ParentDashboard from "../components/dashboards/ParentDashboard";
import AdminDashboard from "../components/dashboards/AdminDashboard";
import { api, User } from "../lib/api";
import { ROLE_LABEL } from "../lib/labels";

/**
 * Role-aware dashboard: renders the interface that matches the user's role.
 *   student -> المرحلة/الفصل/المواد/الاختبارات/نماذج الامتحانات
 *   parent  -> نتائج الأبناء + التوصيات
 *   admin   -> إحصائيات + إدارة الكتب
 */
export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<{ user: User }>("/api/me")
      .then((d) => setUser(d.user))
      .catch(() => router.replace("/login"))
      .finally(() => setLoading(false));
  }, [router]);

  return (
    <>
      <Nav />
      <div className="container">
        {loading && <p className="muted">جاري التحميل...</p>}

        {!loading && user?.role === "student" && <StudentDashboard userName={user.name} />}
        {!loading && user?.role === "parent" && <ParentDashboard userName={user.name} />}
        {!loading && user?.role === "admin" && <AdminDashboard userName={user.name} />}

        {!loading && user && !["student", "parent", "admin"].includes(user.role) && (
          <div className="card fade-up" style={{ textAlign: "center", padding: 44 }}>
            <div className="icon-tile tile-indigo" style={{ margin: "0 auto 14px" }}>🚧</div>
            <h1 style={{ fontSize: 22 }}>واجهة {ROLE_LABEL[user.role] ?? user.role} قريبًا</h1>
            <p className="muted">إحنا شغالين عليها — استخدم باقي صفحات الموقع meanwhile.</p>
          </div>
        )}
      </div>
    </>
  );
}
