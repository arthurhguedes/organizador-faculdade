import { useEffect, useState } from "react";
import { periodsApi, professorsApi, subjectsApi, getSubjectDetails } from "../api/client";
import { useAuth } from "../context/AuthContext";
import {
  ACHIEVEMENTS,
  computeLevel,
  computeXp,
  getWeekActivity,
  recordVisit,
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

const EMPTY_STREAK: StreakState = { current: 0, best: 0, lastVisit: null, history: [] };

export function useGamification() {
  const { user } = useAuth();
  const premium = user?.plan === "premium";
  const [streak] = useState<StreakState>(() => (user ? recordVisit(user.id, premium) : EMPTY_STREAK));
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
    progress: stats && achievement.progress ? achievement.progress(stats, streak) : undefined,
  }));
  const weekActivity = getWeekActivity(streak);

  return {
    streak,
    weekActivity,
    statsLoading: stats === null,
    xp,
    level,
    achievements,
    premium,
  };
}
