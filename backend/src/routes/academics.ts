import { Router, Request, Response } from "express";
import prisma from "../prismaClient";
import { requireAuth, requireRole } from "../middleware/auth";
import {
  STAGES,
  TERMS,
  subjectsForStage,
  subjectMeta,
  stageName,
  termName,
} from "../config/academics";

const router = Router();

/** Exam.config may carry { subject: "<subjectId>" } — read it safely. */
function examSubject(exam: { config: unknown } | null | undefined): string | null {
  const cfg = exam?.config as { subject?: unknown } | null;
  if (cfg && typeof cfg === "object" && typeof cfg.subject === "string") {
    return cfg.subject;
  }
  return null;
}

type AttemptWithExam = {
  id: number;
  score: number | null;
  startedAt: Date;
  finishedAt: Date | null;
  exam: { title: string; config: unknown } | null;
};

/** Latest score per subject id from a list of attempts (most recent wins). */
function latestScoresBySubject(attempts: AttemptWithExam[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const a of [...attempts].sort((x, y) => y.startedAt.getTime() - x.startedAt.getTime())) {
    const subj = examSubject(a.exam);
    if (subj && a.score != null && out[subj] === undefined) {
      out[subj] = a.score;
    }
  }
  return out;
}

/** Simple, honest recommendations derived from the child's scores. */
function buildRecommendations(
  scores: Record<string, number>
): { subjectId: string; level: "strong" | "good" | "weak" | "none"; text: string }[] {
  const out = Object.entries(scores).map(([subjectId, score]) => {
    const name = subjectMeta(subjectId)?.name ?? subjectId;
    if (score >= 85) {
      return { subjectId, level: "strong" as const, text: `أداء ممتاز في ${name} (${Math.round(score)}%) — استمر على نفس الخطة 💪` };
    }
    if (score >= 60) {
      return { subjectId, level: "good" as const, text: `مستوى جيد في ${name} (${Math.round(score)}%) — راجع الأخطاء المتكررة وركّز على حل نماذج امتحانات إضافية.` };
    }
    return { subjectId, level: "weak" as const, text: `يحتاج متابعة أقوى في ${name} (${Math.round(score)}%) — ننصح بحصة مراجعة أسبوعية وحل نموذج امتحان كل أسبوعين.` };
  });
  return out;
}

// ---------------------------------------------------------------------------
// GET /api/academics/catalog — stages, terms and subjects (for the UI)
// ---------------------------------------------------------------------------
router.get("/academics/catalog", requireAuth, (_req: Request, res: Response) => {
  return res.json({
    stages: STAGES,
    terms: TERMS,
    subjectsByStage: Object.fromEntries(
      STAGES.map((s) => [s.id, subjectsForStage(s.id)])
    ),
  });
});

// ---------------------------------------------------------------------------
// PUT /api/profile — student saves education stage + term (upsert)
// ---------------------------------------------------------------------------
router.put("/profile", requireAuth, requireRole("student"), async (req: Request, res: Response) => {
  try {
    const { stage, term } = (req.body ?? {}) as Record<string, string>;
    const data: { stage?: string; term?: string } = {};
    if (stage !== undefined) {
      if (!STAGES.some((s) => s.id === stage)) {
        return res.status(400).json({ error: "invalid_stage" });
      }
      data.stage = stage;
    }
    if (term !== undefined) {
      if (!TERMS.some((t) => t.id === term)) {
        return res.status(400).json({ error: "invalid_term" });
      }
      data.term = term;
    }
    const userId = req.user!.userId;
    const profile = await prisma.studentProfile.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });
    return res.json({ profile });
  } catch (err) {
    console.error("[profile/update]", err);
    return res.status(500).json({ error: "server_error" });
  }
});

// ---------------------------------------------------------------------------
// GET /api/student/overview — stage/term, subjects with latest scores,
// recent attempts and exam templates (نماذج الامتحانات)
// ---------------------------------------------------------------------------
router.get("/student/overview", requireAuth, requireRole("student"), async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const [user, profile, attempts, templates] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, email: true, role: true },
      }),
      prisma.studentProfile.findUnique({ where: { userId } }),
      prisma.attempt.findMany({
        where: { studentUserId: userId },
        orderBy: { startedAt: "desc" },
        take: 12,
        include: { exam: { select: { title: true, config: true } } },
      }),
      prisma.exam.findMany({
        where: { isTemplate: true },
        orderBy: { createdAt: "desc" },
        take: 8,
        select: { id: true, title: true, config: true, createdAt: true },
      }),
    ]);

    const scores = latestScoresBySubject(attempts as AttemptWithExam[]);
    const subjects = subjectsForStage(profile?.stage).map((s) => ({
      ...s,
      score: scores[s.id] ?? null,
    }));

    return res.json({
      user,
      profile: profile
        ? { stage: profile.stage, term: profile.term, grade: profile.grade, class: profile.class }
        : null,
      subjects,
      attempts: attempts.map((a) => {
        const subjectId = examSubject(a.exam);
        const meta = subjectId ? subjectMeta(subjectId) : null;
        return {
          id: a.id,
          examTitle: a.exam?.title ?? "اختبار",
          subjectId,
          subjectName: meta?.name ?? null,
          subjectEmoji: meta?.emoji ?? null,
          score: a.score,
          date: a.finishedAt ?? a.startedAt,
        };
      }),
      templates: templates.map((t) => {
        const subjectId = examSubject(t);
        const meta = subjectId ? subjectMeta(subjectId) : null;
        return {
          id: t.id,
          title: t.title,
          subjectId,
          subjectName: meta?.name ?? null,
          subjectEmoji: meta?.emoji ?? "📝",
          createdAt: t.createdAt,
        };
      }),
    });
  } catch (err) {
    console.error("[student/overview]", err);
    return res.status(500).json({ error: "server_error" });
  }
});

// ---------------------------------------------------------------------------
// GET /api/parent/children — linked children with results + recommendations
// ---------------------------------------------------------------------------
router.get("/parent/children", requireAuth, requireRole("parent"), async (req: Request, res: Response) => {
  try {
    const parentUserId = req.user!.userId;
    const links = await prisma.parentLink.findMany({
      where: { parentUserId },
      include: {
        studentUser: {
          select: {
            id: true,
            name: true,
            email: true,
            studentProfile: { select: { stage: true, term: true, grade: true, class: true } },
          },
        },
      },
    });

    const children = await Promise.all(
      links.map(async (link) => {
        const child = link.studentUser;
        const attempts = await prisma.attempt.findMany({
          where: { studentUserId: child.id },
          orderBy: { startedAt: "desc" },
          include: { exam: { select: { title: true, config: true } } },
        });
        const scores = latestScoresBySubject(attempts as AttemptWithExam[]);
        const stage = child.studentProfile?.stage ?? null;
        const subjects = subjectsForStage(stage).map((s) => ({
          ...s,
          score: scores[s.id] ?? null,
        }));
        const values = Object.values(scores);
        const average = values.length
          ? Math.round(values.reduce((a, b) => a + b, 0) / values.length)
          : null;
        const recommendations = buildRecommendations(scores);
        return {
          id: child.id,
          name: child.name,
          email: child.email,
          profile: {
            stage,
            stageName: stageName(stage),
            term: child.studentProfile?.term ?? null,
            termName: termName(child.studentProfile?.term),
          },
          subjects,
          average,
          results: attempts.slice(0, 10).map((a) => {
            const subjectId = examSubject(a.exam);
            const meta = subjectId ? subjectMeta(subjectId) : null;
            return {
              id: a.id,
              examTitle: a.exam?.title ?? "اختبار",
              subjectName: meta?.name ?? null,
              subjectEmoji: meta?.emoji ?? null,
              score: a.score,
              date: a.finishedAt ?? a.startedAt,
            };
          }),
          recommendations,
        };
      })
    );

    return res.json({ children });
  } catch (err) {
    console.error("[parent/children]", err);
    return res.status(500).json({ error: "server_error" });
  }
});

// ---------------------------------------------------------------------------
// GET /api/admin/stats — dashboard counters
// ---------------------------------------------------------------------------
router.get("/admin/stats", requireAuth, requireRole("admin"), async (_req: Request, res: Response) => {
  try {
    const [users, students, parents, books, exams] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: "student" } }),
      prisma.user.count({ where: { role: "parent" } }),
      prisma.book.count(),
      prisma.exam.count({ where: { isTemplate: true } }),
    ]);
    return res.json({ users, students, parents, books, exams });
  } catch (err) {
    console.error("[admin/stats]", err);
    return res.status(500).json({ error: "server_error" });
  }
});

export default router;
