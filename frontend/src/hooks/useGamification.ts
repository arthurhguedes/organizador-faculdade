import { useEffect, useState } from "react";
import { periodsApi, professorsApi, subjectsApi, getSubjectDetails } from "../api/client";
import {
  ACHIEVEMENTS,
  computeLevel,
  computeXp,
  isPremiumPreview,
  recordVisit,
  setPremiumPreview,
  type AcademicStats,
  type StreakState,
} from "../lib/gamification";

const EMPTY_STATS: AcademicStats = {
  periodsCount: 0,
  subjectsCount: 0,
  professorsCount: 0,
  schedulesCount: 0,
  gradedCount: 0,
};

export function useGamification() {
  const [premium, setPremium] = useState(isPremiumPreview);
  const [streak] = useState<StreakState>(() => recordVisit(isPremiumPreview()));
  const [stats, setStats] = useState<AcademicStats | null>(null);

  useEffect(() => {
    let cancelled = false;

    Promise.all([periodsApi.list(), professorsApi.list(), subjectsApi.list()])
      .then(async ([periods, professors, subjects]) => {
        const details = await Promise.all(subjects.map((s) => getSubjectDetails(s.id)));
        if (cancelled) return;

        const schedulesCount = details.reduce((sum, s) => sum + s.schedules.length, 0);
        const gradedCount = details.reduce(
          (sum, s) =>
            sum +
            s.assignments.filter((a) => a.grade !== null).length +
            s.exams.filter((e) => e.grade !== null).length,
          0,
        );

        setStats({
          periodsCount: periods.length,
          subjectsCount: subjects.length,
          professorsCount: professors.length,
          schedulesCount,
          gradedCount,
        });
      })
      .catch(() => {
        if (!cancelled) setStats(EMPTY_STATS);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const xp = stats ? computeXp(stats, streak.current, premium) : 0;
  const level = computeLevel(xp);
  const achievements = ACHIEVEMENTS.map((achievement) => ({
    ...achievement,
    unlocked: stats !== null && achievement.check(stats, streak),
  }));

  function togglePremiumPreview() {
    const next = !premium;
    setPremiumPreview(next);
    setPremium(next);
  }

  return {
    loading: stats === null,
    streak,
    xp,
    level,
    achievements,
    premium,
    togglePremiumPreview,
  };
}
