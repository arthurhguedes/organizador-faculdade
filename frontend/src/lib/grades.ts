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

export function formatGrade(value: number | null): string {
  return value === null ? "—" : value.toFixed(1);
}

export function formatDate(value: string): string {
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

export function isOverdue(dateStr: string): boolean {
  return new Date(dateStr) < new Date(new Date().toDateString());
}
