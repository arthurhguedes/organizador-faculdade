import type { LucideIcon } from "lucide-react";
import { BookOpen, CalendarRange, ClipboardCheck, Flame, GraduationCap, Layers, Users } from "lucide-react";

const HISTORY_LIMIT = 30;

function streakKey(userId: number): string {
  return `notary:streak:${userId}`;
}

function seenKey(userId: number): string {
  return `notary:streak-seen:${userId}`;
}

/** One-time carry-over from keys that predate per-user namespacing (the
 * pre-rebrand "organizador:" prefix, then a single global "notary:streak"
 * shared by every account on the browser) — without this, migrating users
 * would silently lose their streak the moment the key became per-user. */
function migrateLegacyKeys(userId: number): void {
  const perUserKey = streakKey(userId);
  if (localStorage.getItem(perUserKey) === null) {
    const globalCurrent = localStorage.getItem("notary:streak");
    const globalLegacy = localStorage.getItem("organizador:streak");
    const carryOver = globalCurrent ?? globalLegacy;
    if (carryOver !== null) localStorage.setItem(perUserKey, carryOver);
  }
  localStorage.removeItem("notary:streak");
  localStorage.removeItem("organizador:streak");
}

export type StreakState = {
  current: number;
  best: number;
  lastVisit: string | null;
  history: string[];
};

export type WeekDay = {
  key: string;
  active: boolean;
  isToday: boolean;
  weekday: number;
};

export type AcademicStats = {
  periodsCount: number;
  subjectsCount: number;
  professorsCount: number;
  schedulesCount: number;
  gradedCount: number;
};

function dayKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function todayKey(): string {
  return dayKey(new Date());
}

function daysBetween(a: string, b: string): number {
  const [ay, am, ad] = a.split("-").map(Number);
  const [by, bm, bd] = b.split("-").map(Number);
  const diff = new Date(by, bm - 1, bd).getTime() - new Date(ay, am - 1, ad).getTime();
  return Math.round(diff / 86_400_000);
}

/** A streak of `current` consecutive days ending on `lastVisit` mathematically
 * implies every one of those days was active — this backfills the activity
 * log for accounts that had a streak before per-day history was tracked, so
 * the week strip reads correctly on the very first load after the upgrade
 * instead of showing a fresh start next to an established streak count. */
function synthesizeHistory(current: number, lastVisit: string | null): string[] {
  if (!lastVisit || current <= 0) return [];
  const [y, m, d] = lastVisit.split("-").map(Number);
  const runLength = Math.min(current, HISTORY_LIMIT);
  const days: string[] = [];
  for (let i = runLength - 1; i >= 0; i--) {
    days.push(dayKey(new Date(y, m - 1, d - i)));
  }
  return days;
}

function pushHistory(history: string[], day: string): string[] {
  if (history.includes(day)) return history;
  return [...history, day].slice(-HISTORY_LIMIT);
}

function readStreak(userId: number): StreakState {
  migrateLegacyKeys(userId);
  const raw = localStorage.getItem(streakKey(userId));
  if (!raw) return { current: 0, best: 0, lastVisit: null, history: [] };
  try {
    const parsed = JSON.parse(raw);
    const current = parsed.current ?? 0;
    const lastVisit = parsed.lastVisit ?? null;
    const history: string[] = Array.isArray(parsed.history) && parsed.history.length > 0
      ? parsed.history
      : synthesizeHistory(current, lastVisit);
    return { current, best: parsed.best ?? 0, lastVisit, history };
  } catch {
    return { current: 0, best: 0, lastVisit: null, history: [] };
  }
}

function writeStreak(userId: number, state: StreakState): void {
  try {
    localStorage.setItem(streakKey(userId), JSON.stringify(state));
  } catch {
    // localStorage can throw (Safari private mode, quota exceeded) — the
    // streak just won't persist this visit, no reason to crash the app.
  }
}

export function getStreak(userId: number): StreakState {
  return readStreak(userId);
}

/** Called once per app load. A gap of exactly one missed day is forgiven when
 * `premium` is active — the "proteção de sequência" perk from the Plans page. */
export function recordVisit(userId: number, premium: boolean): StreakState {
  const today = todayKey();
  const state = readStreak(userId);

  if (state.lastVisit === today) {
    if (state.history.includes(today)) return state;
    const next = { ...state, history: pushHistory(state.history, today) };
    writeStreak(userId, next);
    return next;
  }

  if (state.lastVisit === null) {
    const next: StreakState = {
      current: 1,
      best: Math.max(1, state.best),
      lastVisit: today,
      history: pushHistory(state.history, today),
    };
    writeStreak(userId, next);
    return next;
  }

  const gap = daysBetween(state.lastVisit, today);
  const current = gap === 1 || (gap === 2 && premium) ? state.current + 1 : 1;
  const next: StreakState = {
    current,
    best: Math.max(state.best, current),
    lastVisit: today,
    history: pushHistory(state.history, today),
  };
  writeStreak(userId, next);
  return next;
}

/** Last 7 calendar days (oldest first, today last), each flagged for whether
 * the user actually opened the app that day — real activity history, not a
 * decorative sparkline standing in for it. */
export function getWeekActivity(streak: StreakState): WeekDay[] {
  const today = new Date();
  const days: WeekDay[] = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
    const key = dayKey(date);
    days.push({ key, active: streak.history.includes(key), isToday: i === 0, weekday: date.getDay() });
  }
  return days;
}

/** Whether the streak count has grown since the user last actually saw it
 * (tracked separately from `history`, across sessions/devices per browser)
 * — the one legitimate moment for the topbar chip's "bump" flourish to fire. */
export function consumeStreakBump(userId: number, current: number): boolean {
  const key = seenKey(userId);
  const lastSeen = Number(localStorage.getItem(key) ?? "0");
  try {
    localStorage.setItem(key, String(current));
  } catch {
    // non-fatal — worst case the bump flourish doesn't fire this session
  }
  return current > lastSeen;
}

const XP_WEIGHTS = {
  period: 15,
  subject: 10,
  professor: 8,
  schedule: 5,
  graded: 12,
  streakDay: 3,
};

export function computeXp(stats: AcademicStats, streakCurrent: number, premium: boolean): number {
  const base =
    stats.periodsCount * XP_WEIGHTS.period +
    stats.subjectsCount * XP_WEIGHTS.subject +
    stats.professorsCount * XP_WEIGHTS.professor +
    stats.schedulesCount * XP_WEIGHTS.schedule +
    stats.gradedCount * XP_WEIGHTS.graded +
    streakCurrent * XP_WEIGHTS.streakDay;

  return premium ? base * 2 : base;
}

const LEVELS = [
  { name: "Calouro", threshold: 0 },
  { name: "Estudante Aplicado", threshold: 60 },
  { name: "Frequência Exemplar", threshold: 150 },
  { name: "Nota Alta", threshold: 280 },
  { name: "Bolsista", threshold: 450 },
  { name: "Monitor(a)", threshold: 650 },
  { name: "Referência da Turma", threshold: 900 },
  { name: "Veterano(a)", threshold: 1200 },
  { name: "Mestre do Semestre", threshold: 1600 },
  { name: "Lenda do Coeficiente", threshold: 2200 },
];

export type LevelInfo = {
  name: string;
  xp: number;
  nextThreshold: number | null;
  progressPct: number;
};

export function computeLevel(xp: number): LevelInfo {
  let index = 0;
  for (let i = 0; i < LEVELS.length; i++) {
    if (xp >= LEVELS[i].threshold) index = i;
    else break;
  }
  const current = LEVELS[index];
  const next = LEVELS[index + 1] ?? null;
  const progressPct = next
    ? Math.min(100, Math.round(((xp - current.threshold) / (next.threshold - current.threshold)) * 100))
    : 100;

  return { name: current.name, xp, nextThreshold: next?.threshold ?? null, progressPct };
}

export type AchievementProgress = {
  value: number;
  target: number;
};

export type Achievement = {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  check: (stats: AcademicStats, streak: StreakState) => boolean;
  progress?: (stats: AcademicStats, streak: StreakState) => AchievementProgress;
};

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: "primeira-materia",
    title: "Primeiro registro",
    description: "Cadastre sua primeira matéria.",
    icon: BookOpen,
    check: (stats) => stats.subjectsCount >= 1,
  },
  {
    id: "grade-em-dia",
    title: "Grade em dia",
    description: "Cadastre o horário de pelo menos uma matéria.",
    icon: CalendarRange,
    check: (stats) => stats.schedulesCount >= 1,
  },
  {
    id: "primeira-nota",
    title: "Primeira nota lançada",
    description: "Lance a nota de uma atividade ou prova.",
    icon: ClipboardCheck,
    check: (stats) => stats.gradedCount >= 1,
  },
  {
    id: "semana-cheia",
    title: "Semana cheia",
    description: "Abra o app por 7 dias seguidos.",
    icon: Flame,
    check: (_stats, streak) => streak.best >= 7,
    progress: (_stats, streak) => ({ value: Math.min(streak.best, 7), target: 7 }),
  },
  {
    id: "mes-de-disciplina",
    title: "Um mês de disciplina",
    description: "Abra o app por 30 dias seguidos.",
    icon: Flame,
    check: (_stats, streak) => streak.best >= 30,
    progress: (_stats, streak) => ({ value: Math.min(streak.best, 30), target: 30 }),
  },
  {
    id: "arquivo-robusto",
    title: "Arquivo robusto",
    description: "Cadastre 8 matérias ou mais.",
    icon: Layers,
    check: (stats) => stats.subjectsCount >= 8,
    progress: (stats) => ({ value: Math.min(stats.subjectsCount, 8), target: 8 }),
  },
  {
    id: "corpo-docente",
    title: "Corpo docente completo",
    description: "Cadastre 5 professores ou mais.",
    icon: Users,
    check: (stats) => stats.professorsCount >= 5,
    progress: (stats) => ({ value: Math.min(stats.professorsCount, 5), target: 5 }),
  },
  {
    id: "multiplos-periodos",
    title: "Mais de um semestre",
    description: "Cadastre um segundo período letivo.",
    icon: GraduationCap,
    check: (stats) => stats.periodsCount >= 2,
    progress: (stats) => ({ value: Math.min(stats.periodsCount, 2), target: 2 }),
  },
];
