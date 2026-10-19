export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export type User = {
  id: number;
  name: string | null;
  email: string;
  role: string; // "student" | "parent" | "admin" | "teacher"
};

export type Book = {
  id: number;
  title: string;
  pdfUrl: string;
  storageKey?: string | null;
  textExtracted: boolean;
  createdAt: string;
  uploadedBy?: { id: number; name: string | null } | null;
};

// ---------------- Academics (role dashboards) ----------------

export type CatalogItem = { id: string; name: string };
export type Subject = { id: string; name: string; emoji: string; score?: number | null };

export type Catalog = {
  stages: CatalogItem[];
  terms: CatalogItem[];
  subjectsByStage: Record<string, Subject[]>;
};

export type StudentProfile = { stage: string | null; term: string | null } | null;

export type AttemptRow = {
  id: number;
  examTitle: string;
  subjectId: string | null;
  subjectName: string | null;
  subjectEmoji: string | null;
  score: number | null;
  date: string;
};

export type ExamTemplate = {
  id: number;
  title: string;
  subjectId: string | null;
  subjectName: string | null;
  subjectEmoji: string;
  createdAt: string;
};

export type StudentOverview = {
  user: User;
  profile: StudentProfile;
  subjects: Subject[];
  attempts: AttemptRow[];
  templates: ExamTemplate[];
};

export type Recommendation = { subjectId: string; level: "strong" | "good" | "weak" | "none"; text: string };

export type Child = {
  id: number;
  name: string | null;
  email: string;
  profile: { stage: string | null; stageName: string; term: string | null; termName: string };
  subjects: Subject[];
  average: number | null;
  results: AttemptRow[];
  recommendations: Recommendation[];
};

export type AdminStats = { users: number; students: number; parents: number; books: number; exams: number };

/**
 * Small fetch wrapper.
 * - credentials: "include" so the HttpOnly session cookie is sent.
 * - JSON bodies by default; pass FormData as-is for uploads.
 */
export async function api<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const { body, headers, ...rest } = options;
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
  const res = await fetch(`${API_URL}${path}`, {
    credentials: "include",
    ...rest,
    body,
    headers: isFormData ? headers : { "Content-Type": "application/json", ...(headers || {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = (data as { error?: string }).error || `HTTP_${res.status}`;
    throw new Error(err);
  }
  return data as T;
}

// The mobile token (from /api/auth/login) is stored in localStorage so the
// /login-qr page can simulate the phone confirming a scanned QR code.
export const MOBILE_TOKEN_KEY = "edu_mobile_token";
