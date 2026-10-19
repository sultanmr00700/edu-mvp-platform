import { Router, Request, Response, NextFunction } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { randomUUID } from "crypto";
import prisma from "../prismaClient";
import { requireAuth } from "../middleware/auth";
import { enqueuePdfJob } from "../workers/pdfWorker";

/**
 * Local disk storage for MVP.
 * TODO(later): swap with Supabase Storage / S3 without changing the API.
 */
export const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || "uploads");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const MAX_PDF_SIZE = 25 * 1024 * 1024; // 25 MB

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || ".pdf";
    cb(null, `${Date.now()}-${randomUUID()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_PDF_SIZE },
  fileFilter: (_req, file, cb) => {
    const isPdf =
      file.mimetype === "application/pdf" || /\.pdf$/i.test(file.originalname || "");
    if (!isPdf) {
      return cb(new Error("ONLY_PDF"));
    }
    return cb(null, true);
  },
});

const router = Router();

// ---------------------------------------------------------------------------
// POST /api/books/upload — multipart/form-data: file (+ optional title)
// ---------------------------------------------------------------------------
router.post("/upload", requireAuth, (req: Request, res: Response, next: NextFunction) => {
  upload.single("file")(req, res, (err) => {
    if (err) return next(err);
    return createBook(req, res, next);
  });
});

async function createBook(req: Request, res: Response, _next: NextFunction) {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: "file_required" });
    }
    const bodyTitle = typeof req.body?.title === "string" ? req.body.title.trim() : "";
    const title = bodyTitle || file.originalname.replace(/\.pdf$/i, "");
    const book = await prisma.book.create({
      data: {
        title,
        pdfUrl: `/uploads/${file.filename}`,
        storageKey: file.filename,
        uploadedById: req.user!.userId,
      },
    });
    return res.status(201).json({ book });
  } catch (err) {
    console.error("[books/upload]", err);
    return res.status(500).json({ error: "server_error" });
  }
}

// ---------------------------------------------------------------------------
// GET /api/books — library listing
// ---------------------------------------------------------------------------
router.get("/", requireAuth, async (_req: Request, res: Response) => {
  try {
    const books = await prisma.book.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        pdfUrl: true,
        textExtracted: true,
        createdAt: true,
        uploadedBy: { select: { id: true, name: true } },
      },
    });
    return res.json({ books });
  } catch (err) {
    console.error("[books/list]", err);
    return res.status(500).json({ error: "server_error" });
  }
});

// ---------------------------------------------------------------------------
// GET /api/books/:id — book details
// ---------------------------------------------------------------------------
router.get("/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: "invalid_id" });
    }
    const book = await prisma.book.findUnique({
      where: { id },
      include: { uploadedBy: { select: { id: true, name: true } } },
    });
    if (!book) {
      return res.status(404).json({ error: "not_found" });
    }
    return res.json({ book });
  } catch (err) {
    console.error("[books/get]", err);
    return res.status(500).json({ error: "server_error" });
  }
});

// ---------------------------------------------------------------------------
// POST /api/books/:id/process — enqueue PDF text-extraction (worker skeleton).
// Returns 503 when Redis/Bull queue is unavailable (MVP-friendly).
// ---------------------------------------------------------------------------
router.post("/:id/process", requireAuth, async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: "invalid_id" });
    }
    const book = await prisma.book.findUnique({ where: { id } });
    if (!book) {
      return res.status(404).json({ error: "not_found" });
    }
    try {
      const jobId = await enqueuePdfJob({ bookId: book.id, storageKey: book.storageKey ?? "" });
      return res.status(202).json({ queued: true, jobId });
    } catch {
      return res.status(503).json({ error: "queue_unavailable" });
    }
  } catch (err) {
    console.error("[books/process]", err);
    return res.status(500).json({ error: "server_error" });
  }
});

export default router;
