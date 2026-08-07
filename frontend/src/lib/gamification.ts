import type { LucideIcon } from "lucide-react";
import { BookOpen, CalendarRange, ClipboardCheck, Flame, GraduationCap, Layers, Users } from "lucide-react";

const STREAK_KEY = "notary:streak";
const PREMIUM_KEY = "notary:premium-preview";

export type StreakState = {
  current: number;
  best: number;
  lastVisit: string | null;
};

export type AcademicStats = {
  periodsCount: number;
  subjectsCount: number;
  professorsCount: number;
  schedulesCount: number;
  gradedCount: number;
};

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function daysBetween(a: string, b: string): number {
  const [ay, am, ad] = a.split("-").map(Number);
  const [by, bm, bd] = b.split("-").map(Number);
  const diff = new Date(by, bm - 1, bd).getTime() - new Date(ay, am - 1, ad).getTime();
  return Math.round(diff / 86_400_000);
}

function readStreak(): StreakState {
  const raw = localStorage.getItem(STREAK_KEY);
  if (!raw) return { current: 0, best: 0, lastVisit: null };
  try {
    const parsed = JSON.parse(raw);
    return {
      current: parsed.current ?? 0,
      best: parsed.best ?? 0,
      lastVisit: parsed.lastVisit ?? null,
    };
  } catch {
    return { current: 0, best: 0, lastVisit: null };
  }
}

function writeStreak(state: StreakState): void {
  localStorage.setItem(STREAK_KEY, JSON.stringify(state));
}

export function getStreak(): StreakState {
  return readStreak();
}

/** Called once per app load. A gap of exactly one missed day is forgiven when
 * `premium` is active — the "proteção de sequência" perk from the Plans page. */
export function recordVisit(premium: boolean): StreakState {
  const today = todayKey();
  const state = readStreak();

  if (state.lastVisit === today) return state;

  if (state.lastVisit === null) {
    const next = { current: 1, best: Math.max(1, state.best), lastVisit: today };
    writeStreak(next);
    return next;
  }

  const gap = daysBetween(state.lastVisit, today);
  const current = gap === 1 || (gap === 2 && premium) ? state.current + 1 : 1;
  const next = { current, best: Math.max(state.best, current), lastVisit: today };
  writeStreak(next);
  return next;
}

export function isPremiumPreview(): boolean {
  return localStorage.getItem(PREMIUM_KEY) === "1";
}

export function setPremiumPreview(value: boolean): void {
  localStorage.setItem(PREMIUM_KEY, value ? "1" : "0");
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

export type Achievement = {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  check: (stats: AcademicStats, streak: StreakState) => boolean;
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
  },
  {
    id: "mes-de-disciplina",
    title: "Um mês de disciplina",
    description: "Abra o app por 30 dias seguidos.",
    icon: Flame,
    check: (_stats, streak) => streak.best >= 30,
  },
  {
    id: "arquivo-robusto",
    title: "Arquivo robusto",
    description: "Cadastre 8 matérias ou mais.",
    icon: Layers,
    check: (stats) => stats.subjectsCount >= 8,
  },
  {
    id: "corpo-docente",
    title: "Corpo docente completo",
    description: "Cadastre 5 professores ou mais.",
    icon: Users,
    check: (stats) => stats.professorsCount >= 5,
  },
  {
    id: "multiplos-periodos",
    title: "Mais de um semestre",
    description: "Cadastre um segundo período letivo.",
    icon: GraduationCap,
    check: (stats) => stats.periodsCount >= 2,
  },
];
