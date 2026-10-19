export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export type User = {
  id: number;
  name: string | null;
  email: string;
  role: string;
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
