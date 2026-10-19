import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import multer from "multer";
import authRoutes, { meRouter } from "./routes/auth";
import booksRoutes, { UPLOAD_DIR } from "./routes/books";
import academicsRoutes from "./routes/academics";

const app = express();
const PORT = Number(process.env.PORT || 4000);
const CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:3000";

app.use(cors({ origin: CORS_ORIGIN, credentials: true }));
app.use(express.json());
app.use(cookieParser());

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api", meRouter); // GET /api/me
app.use("/api/books", booksRoutes);
// Academics: GET /api/academics/catalog, PUT /api/profile,
// GET /api/student/overview, GET /api/parent/children, GET /api/admin/stats
app.use("/api", academicsRoutes);

// Serve uploaded PDFs (the reader page embeds these URLs in an <iframe>)
app.use("/uploads", express.static(UPLOAD_DIR));

// Unknown API routes -> JSON 404
app.use("/api", (_req, res) => {
  res.status(404).json({ error: "not_found" });
});

// Error handler (multer + generic)
app.use(
  (
    err: unknown,
    _req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    if (res.headersSent) {
      return next(err);
    }
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ error: "upload_error", message: err.message });
    }
    if (err instanceof Error && err.message === "ONLY_PDF") {
      return res.status(400).json({ error: "only_pdf_allowed" });
    }
    console.error("[server]", err);
    return res.status(500).json({ error: "server_error" });
  }
);

app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
  console.log(`CORS origin: ${CORS_ORIGIN}`);
});
