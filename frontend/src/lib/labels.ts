/** Arabic labels + small display helpers shared by the dashboards. */

export const STAGE_LABEL: Record<string, string> = {
  primary: "المرحلة الابتدائية",
  prep: "المرحلة الإعدادية",
  secondary: "المرحلة الثانوية",
};

export const TERM_LABEL: Record<string, string> = {
  term1: "الفصل الدراسي الأول",
  term2: "الفصل الدراسي الثاني",
};

export const ROLE_LABEL: Record<string, string> = {
  student: "طالب",
  parent: "ولي أمر",
  admin: "أدمن",
  teacher: "مدرس",
};

/** Score (%) -> css class for coloring. */
export function scoreClass(score: number | null | undefined): string {
  if (score == null) return "score-none";
  if (score >= 85) return "score-high";
  if (score >= 60) return "score-mid";
  return "score-low";
}

export function scoreLabel(score: number | null | undefined): string {
  return score == null ? "—" : `${Math.round(score)}%`;
}
