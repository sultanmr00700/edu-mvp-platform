/**
 * Academic catalog for the MVP: education stages, terms and the subjects
 * taught in each stage. Served to the frontend via /api/academics/catalog.
 *
 * Stage ids: "primary" | "prep" | "secondary"
 * Term ids:  "term1"   | "term2"
 */

export type Subject = { id: string; name: string; emoji: string };

export const STAGES = [
  { id: "primary", name: "المرحلة الابتدائية" },
  { id: "prep", name: "المرحلة الإعدادية" },
  { id: "secondary", name: "المرحلة الثانوية" },
] as const;

export const TERMS = [
  { id: "term1", name: "الفصل الدراسي الأول" },
  { id: "term2", name: "الفصل الدراسي الثاني" },
] as const;

const SUBJECTS_BY_STAGE: Record<string, Subject[]> = {
  primary: [
    { id: "arabic", name: "اللغة العربية", emoji: "📖" },
    { id: "math", name: "الرياضيات", emoji: "📐" },
    { id: "english", name: "اللغة الإنجليزية", emoji: "🌍" },
    { id: "science", name: "العلوم", emoji: "🔬" },
    { id: "social", name: "الدراسات الاجتماعية", emoji: "🗺️" },
    { id: "religion", name: "التربية الدينية", emoji: "🕌" },
  ],
  prep: [
    { id: "arabic", name: "اللغة العربية", emoji: "📖" },
    { id: "math", name: "الرياضيات", emoji: "📐" },
    { id: "english", name: "اللغة الإنجليزية", emoji: "🌍" },
    { id: "physics", name: "الفيزياء", emoji: "⚛️" },
    { id: "chemistry", name: "الكيمياء", emoji: "🧪" },
    { id: "biology", name: "الأحياء", emoji: "🧬" },
    { id: "history", name: "التاريخ", emoji: "🏛️" },
  ],
  secondary: [
    { id: "arabic", name: "اللغة العربية", emoji: "📖" },
    { id: "english", name: "اللغة الإنجليزية", emoji: "🌍" },
    { id: "math", name: "التفاضل والتكامل", emoji: "📐" },
    { id: "physics", name: "الفيزياء", emoji: "⚛️" },
    { id: "chemistry", name: "الكيمياء", emoji: "🧪" },
    { id: "biology", name: "الأحياء", emoji: "🧬" },
  ],
};

const ALL_SUBJECTS = new Map<string, Subject>();
for (const list of Object.values(SUBJECTS_BY_STAGE)) {
  for (const s of list) ALL_SUBJECTS.set(s.id, s);
}

export function subjectsForStage(stage: string | null | undefined): Subject[] {
  if (!stage || !SUBJECTS_BY_STAGE[stage]) return [];
  return SUBJECTS_BY_STAGE[stage];
}

export function subjectMeta(subjectId: string): Subject | null {
  return ALL_SUBJECTS.get(subjectId) ?? null;
}

export function stageName(stage: string | null | undefined): string {
  return STAGES.find((s) => s.id === stage)?.name ?? "غير محددة";
}

export function termName(term: string | null | undefined): string {
  return TERMS.find((t) => t.id === term)?.name ?? "غير محدد";
}
