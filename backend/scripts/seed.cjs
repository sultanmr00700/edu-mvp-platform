/**
 * Idempotent seed for the MVP demo family:
 *   admin@edu.local  / admin1234   (role: admin)
 *   parent@edu.local / parent1234  (role: parent, linked to the student)
 *   student@edu.local/ student1234 (role: student, stage=secondary, term=term1)
 * plus 6 exam templates (نماذج الامتحانات) and one attempt/نتيجة per subject.
 *
 * Run: npx prisma db seed   (or: node scripts/seed.cjs from backend/)
 */
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");

const prisma = new PrismaClient();

const EXAMS = [
  { title: "نموذج امتحان الرياضيات — الفصل الأول", subject: "math", score: 92 },
  { title: "نموذج امتحان الفيزياء — الفصل الأول", subject: "physics", score: 58 },
  { title: "نموذج امتحان الكيمياء — الفصل الأول", subject: "chemistry", score: 74 },
  { title: "نموذج امتحان الأحياء — الفصل الأول", subject: "biology", score: 95 },
  { title: "نموذج امتحان اللغة العربية — الفصل الأول", subject: "arabic", score: 88 },
  { title: "نموذج امتحان الإنجليزي — الفصل الأول", subject: "english", score: 63 },
];

async function upsertUser(email, password, name, role) {
  const passwordHash = await bcrypt.hash(password, 10);
  return prisma.user.upsert({
    where: { email },
    create: { email, name, role, passwordHash },
    update: { name, role, passwordHash },
  });
}

async function main() {
  console.log("[seed] creating demo family...");
  const admin = await upsertUser("admin@edu.local", "admin1234", "إدارة المنصة", "admin");
  const parent = await upsertUser("parent@edu.local", "parent1234", "ولي أمر تجريبي", "parent");
  const student = await upsertUser("student@edu.local", "student1234", "طالب تجريبي", "student");

  // Student profile: stage + term
  await prisma.studentProfile.upsert({
    where: { userId: student.id },
    create: { userId: student.id, stage: "secondary", term: "term1", grade: "3", class: "2" },
    update: { stage: "secondary", term: "term1" },
  });

  // Parent <-> student link
  const existingLink = await prisma.parentLink.findUnique({
    where: { parentUserId_studentUserId: { parentUserId: parent.id, studentUserId: student.id } },
  });
  if (!existingLink) {
    await prisma.parentLink.create({
      data: { parentUserId: parent.id, studentUserId: student.id },
    });
  }

  console.log("[seed] creating exam templates + attempts...");
  for (const examDef of EXAMS) {
    let exam = await prisma.exam.findFirst({ where: { title: examDef.title } });
    if (!exam) {
      exam = await prisma.exam.create({
        data: {
          title: examDef.title,
          createdById: admin.id,
          isTemplate: true,
          config: { subject: examDef.subject, stage: "secondary", term: "term1" },
        },
      });
    }
    const attempt = await prisma.attempt.findFirst({
      where: { studentUserId: student.id, examId: exam.id },
    });
    if (!attempt) {
      await prisma.attempt.create({
        data: {
          studentUserId: student.id,
          examId: exam.id,
          score: examDef.score,
          finishedAt: new Date(),
        },
      });
    }
  }

  const counts = {
    users: await prisma.user.count(),
    exams: await prisma.exam.count(),
    attempts: await prisma.attempt.count(),
  };
  console.log("[seed] done ✓", JSON.stringify(counts));
  console.log("[seed] accounts: admin@edu.local/admin1234, parent@edu.local/parent1234, student@edu.local/student1234");
}

main()
  .catch((e) => {
    console.error("[seed] failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
