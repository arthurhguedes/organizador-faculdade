import type { Assignment, Exam } from "../api/types";

export function subjectAverage(assignments: Assignment[], exams: Exam[]): number | null {
  const graded = [...assignments, ...exams].filter(
    (item): item is (Assignment | Exam) & { grade: number } => item.grade !== null,
  );

  if (graded.length === 0) {
    return null;
  }

  const totalWeight = graded.reduce((sum, item) => sum + item.weight, 0);
  if (totalWeight === 0) {
    return null;
  }

  const weightedSum = graded.reduce((sum, item) => sum + item.grade * item.weight, 0);
  return weightedSum / totalWeight;
}

export function maxAbsences(workload: number): number {
  return Math.floor(workload * 0.25);
}

export function formatGrade(value: number | null): string {
  return value === null ? "—" : value.toFixed(1);
}

export function formatHours(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h${String(m).padStart(2, "0")}`;
}

export function formatDate(value: string): string {
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

// Toda data do app é "YYYY-MM-DD" (colunas `date` do Postgres, sem hora nem
// fuso), então a comparação é feita como texto: `new Date("2026-08-29")` é
// interpretado como meia-noite **UTC** pelo JS, o que em qualquer fuso
// negativo (como o do Brasil) cai no dia anterior — era por isso que uma
// prova marcada pra hoje já aparecia com o selo "atrasada".
export function isOverdue(dateStr: string): boolean {
  return dateStr < todayISO();
}

export function todayISO(): string {
  return toISODate(new Date());
}

function toISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function addDaysISO(dateISO: string, days: number): string {
  const d = new Date(`${dateISO}T00:00:00`);
  d.setDate(d.getDate() + days);
  // Formata pelos campos locais, não via toISOString(): esse converte pra UTC
  // e devolveria o dia anterior em fusos positivos.
  return toISODate(d);
}

export function relativeDayLabel(dateStr: string): string | null {
  // Ambos como meia-noite local, pelo mesmo motivo de isOverdue.
  const target = new Date(`${dateStr}T00:00:00`);
  const today = new Date(`${todayISO()}T00:00:00`);
  const diffDays = Math.round((target.getTime() - today.getTime()) / 86_400_000);

  if (diffDays < 0) return null;
  if (diffDays === 0) return "hoje";
  if (diffDays === 1) return "amanhã";
  if (diffDays <= 7) return `em ${diffDays} dias`;
  return null;
}
