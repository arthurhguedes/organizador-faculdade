import { useEffect, useState } from "react";
import { subjectsApi, getSubjectDetails } from "../api/client";
import type { SubjectDetails } from "../api/types";

export type UpcomingItem = {
  kind: "assignment" | "exam";
  id: number;
  subjectId: number;
  subjectName: string;
  title: string;
  date: string;
  grade: number | null;
};

export function useDashboardData(periodId: number | null) {
  const [subjects, setSubjects] = useState<SubjectDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (periodId === null) {
      setSubjects([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    subjectsApi
      .list()
      .then(async (all) => {
        const periodSubjects = all.filter((s) => s.periodId === periodId);
        const details = await Promise.all(periodSubjects.map((s) => getSubjectDetails(s.id)));
        if (!cancelled) setSubjects(details);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Erro ao carregar dashboard");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [periodId]);

  const upcoming: UpcomingItem[] = subjects
    .flatMap((subject) => [
      ...subject.assignments.map((a) => ({
        kind: "assignment" as const,
        id: a.id,
        subjectId: subject.id,
        subjectName: subject.name,
        title: a.title,
        date: a.dueDate,
        grade: a.grade,
      })),
      ...subject.exams.map((e) => ({
        kind: "exam" as const,
        id: e.id,
        subjectId: subject.id,
        subjectName: subject.name,
        title: e.title,
        date: e.date,
        grade: e.grade,
      })),
    ])
    .sort((a, b) => a.date.localeCompare(b.date));

  return { subjects, upcoming, loading, error };
}
