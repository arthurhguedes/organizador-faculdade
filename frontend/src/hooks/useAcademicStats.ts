import { useEffect, useState } from "react";
import { getAllSubjectDetails, studySessionsApi } from "../api/client";
import type { SubjectDetails } from "../api/types";
import { subjectAverage } from "../lib/grades";

export type AcademicStats = {
  loading: boolean;
  courseAverage: number | null;
  currentPeriodAverage: number | null;
  coefficient: number | null;
  totalStudyMinutes: number;
};

function simpleAverage(subjects: SubjectDetails[]): number | null {
  const averages = subjects
    .map((s) => subjectAverage(s.assignments, s.exams))
    .filter((avg): avg is number => avg !== null);

  if (averages.length === 0) return null;
  return averages.reduce((sum, avg) => sum + avg, 0) / averages.length;
}

function weightedCoefficient(subjects: SubjectDetails[]): number | null {
  const graded = subjects
    .map((s) => ({ average: subjectAverage(s.assignments, s.exams), workload: s.workload }))
    .filter((s): s is { average: number; workload: number } => s.average !== null);

  const totalWorkload = graded.reduce((sum, s) => sum + s.workload, 0);
  if (totalWorkload === 0) return null;

  const weightedSum = graded.reduce((sum, s) => sum + s.average * s.workload, 0);
  return weightedSum / totalWorkload;
}

export function useAcademicStats(currentPeriodId: number | null): AcademicStats {
  const [subjects, setSubjects] = useState<SubjectDetails[]>([]);
  const [totalStudyMinutes, setTotalStudyMinutes] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    Promise.all([
      getAllSubjectDetails(),
      studySessionsApi.list(),
    ])
      .then(([details, sessions]) => {
        if (cancelled) return;
        setSubjects(details);
        setTotalStudyMinutes(sessions.reduce((sum, s) => sum + s.durationMinutes, 0));
      })
      .catch(() => {
        if (!cancelled) {
          setSubjects([]);
          setTotalStudyMinutes(0);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const currentPeriodSubjects = subjects.filter((s) => s.periodId === currentPeriodId);

  return {
    loading,
    courseAverage: simpleAverage(subjects),
    currentPeriodAverage: simpleAverage(currentPeriodSubjects),
    coefficient: weightedCoefficient(subjects),
    totalStudyMinutes,
  };
}
