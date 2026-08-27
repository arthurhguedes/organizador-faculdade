import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { subjectsApi, studySessionsApi, ApiError } from "../api/client";
import { todayISO } from "../lib/grades";
import type { Subject } from "../api/types";
import { usePeriods } from "./PeriodContext";
import { useToast } from "./ToastContext";

export type PomodoroPhase = "focus" | "short-break" | "long-break";

const STORAGE_KEY = "notary:pomodoro";

type StoredState = {
  phase: PomodoroPhase;
  running: boolean;
  phaseEndAt: number | null;
  pausedSecondsLeft: number;
  cyclesCompleted: number;
  focusMin: number;
  breakMin: number;
  longBreakMin: number;
  subjectId: string;
  topic: string;
};

const DEFAULTS: StoredState = {
  phase: "focus",
  running: false,
  phaseEndAt: null,
  pausedSecondsLeft: 25 * 60,
  cyclesCompleted: 0,
  focusMin: 25,
  breakMin: 5,
  longBreakMin: 15,
  subjectId: "",
  topic: "",
};

function loadStored(): StoredState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return DEFAULTS;
  }
}

type PomodoroContextValue = {
  phase: PomodoroPhase;
  running: boolean;
  secondsLeft: number;
  phaseDurationSeconds: number;
  cyclesCompleted: number;
  isActive: boolean;
  focusMin: number;
  breakMin: number;
  longBreakMin: number;
  subjectId: string;
  topic: string;
  subjects: Subject[];
  setFocusMin: (min: number) => void;
  setBreakMin: (min: number) => void;
  setLongBreakMin: (min: number) => void;
  setSubjectId: (id: string) => void;
  setTopic: (topic: string) => void;
  start: () => void;
  pause: () => void;
  reset: () => void;
  skipToBreak: () => void;
  skipToFocus: () => void;
  /** Muda a cada `study_session` criada pelo timer — páginas com lista própria
   * de sessões (ex: Estudos) observam isso pra recarregar, já que a criação
   * pode acontecer com o usuário em qualquer outra rota. */
  lastSessionCreatedAt: number | null;
};

const PomodoroContext = createContext<PomodoroContextValue | null>(null);

export function PomodoroProvider({ children }: { children: ReactNode }) {
  const { selectedPeriodId } = usePeriods();
  const { notify } = useToast();

  const initial = useRef(loadStored()).current;

  const [phase, setPhase] = useState<PomodoroPhase>(initial.phase);
  const [running, setRunning] = useState(initial.running);
  const [phaseEndAt, setPhaseEndAt] = useState<number | null>(initial.phaseEndAt);
  const [pausedSecondsLeft, setPausedSecondsLeft] = useState(initial.pausedSecondsLeft);
  const [cyclesCompleted, setCyclesCompleted] = useState(initial.cyclesCompleted);
  const [focusMin, setFocusMinState] = useState(initial.focusMin);
  const [breakMin, setBreakMinState] = useState(initial.breakMin);
  const [longBreakMin, setLongBreakMinState] = useState(initial.longBreakMin);
  const [subjectId, setSubjectId] = useState(initial.subjectId);
  const [topic, setTopic] = useState(initial.topic);
  const [lastSessionCreatedAt, setLastSessionCreatedAt] = useState<number | null>(null);

  const [now, setNow] = useState(() => Date.now());

  const [subjects, setSubjects] = useState<Subject[]>([]);
  useEffect(() => {
    subjectsApi.list().then(setSubjects).catch(() => {});
  }, []);
  const periodSubjects = useMemo(
    () => subjects.filter((s) => s.periodId === selectedPeriodId),
    [subjects, selectedPeriodId],
  );

  // Contagem baseada em timestamp (não em decremento por tick): uma aba em
  // segundo plano atrasa o setInterval, mas o cálculo sempre parte do
  // Date.now() atual, então se autocorrige assim que a aba volta ao foco —
  // em vez de acumular atraso como um countdown decrementado por tick faria.
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [running]);

  const phaseDurationSeconds =
    (phase === "focus" ? focusMin : phase === "short-break" ? breakMin : longBreakMin) * 60;

  const secondsLeft =
    running && phaseEndAt !== null ? Math.max(0, Math.round((phaseEndAt - now) / 1000)) : pausedSecondsLeft;

  function transitionPhase(nextPhase: PomodoroPhase, nextDurationMin: number, keepRunning: boolean) {
    setPhase(nextPhase);
    if (keepRunning) {
      setPhaseEndAt(Date.now() + nextDurationMin * 60 * 1000);
    } else {
      setPhaseEndAt(null);
      setPausedSecondsLeft(nextDurationMin * 60);
    }
  }

  // Fecha o ciclo quando a fase chega a zero — dispara mesmo se o usuário
  // não estiver na página Estudos, porque o contexto vive no App inteiro.
  //
  // completedPhaseEndAtRef dedupe: se o app monta com um phaseEndAt do
  // localStorage já no passado (fechou com o foco rodando, reabriu depois),
  // esse efeito já nasce "vencido" no commit inicial — e o StrictMode do
  // React roda efeitos de montagem duas vezes em dev (monta → limpa → monta
  // de novo) antes de qualquer novo render acontecer, então as duas
  // invocações veem o mesmo `phaseEndAt` velho e, sem essa trava, criariam a
  // study_session em duplicidade. phaseEndAt muda pra um valor novo a cada
  // transição de fase, então isso não bloqueia conclusões futuras de verdade.
  const completedPhaseEndAtRef = useRef<number | null>(null);
  useEffect(() => {
    if (!running || secondsLeft > 0) return;
    if (completedPhaseEndAtRef.current === phaseEndAt) return;
    completedPhaseEndAtRef.current = phaseEndAt;

    if (phase === "focus") {
      const subjectIdNum = subjectId ? Number(subjectId) : null;
      const topicTrimmed = topic.trim();
      studySessionsApi
        .create({
          subjectId: subjectIdNum,
          topic: topicTrimmed || null,
          date: todayISO(),
          durationMinutes: focusMin,
          source: "pomodoro",
        })
        .then(() => {
          notify(`Sessão de foco registrada: ${focusMin} min`, "success");
          setLastSessionCreatedAt(Date.now());
        })
        .catch((err) => notify(err instanceof ApiError ? err.message : "Erro ao registrar sessão", "error"));

      const nextCycles = cyclesCompleted + 1;
      setCyclesCompleted(nextCycles);
      const isLong = nextCycles % 4 === 0;
      transitionPhase(isLong ? "long-break" : "short-break", isLong ? longBreakMin : breakMin, true);
    } else {
      transitionPhase("focus", focusMin, false);
      setRunning(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft, running]);

  useEffect(() => {
    const snapshot: StoredState = {
      phase,
      running,
      phaseEndAt,
      pausedSecondsLeft,
      cyclesCompleted,
      focusMin,
      breakMin,
      longBreakMin,
      subjectId,
      topic,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  }, [phase, running, phaseEndAt, pausedSecondsLeft, cyclesCompleted, focusMin, breakMin, longBreakMin, subjectId, topic]);

  const start = () => {
    const startedAt = Date.now();
    setNow(startedAt);
    setPhaseEndAt(startedAt + pausedSecondsLeft * 1000);
    setRunning(true);
  };

  // Calcula a partir de Date.now() direto, não do `secondsLeft` reativo:
  // esse deriva do state `now`, que só é atualizado pelo setInterval de 1s
  // enquanto `running` — clicar em pausar antes do primeiro tick pausaria
  // com um `now` desatualizado, inflando `pausedSecondsLeft` a cada ciclo
  // start/pause rápido.
  const pause = () => {
    const freshSecondsLeft =
      phaseEndAt !== null ? Math.max(0, Math.round((phaseEndAt - Date.now()) / 1000)) : pausedSecondsLeft;
    setPausedSecondsLeft(freshSecondsLeft);
    setPhaseEndAt(null);
    setRunning(false);
  };

  // Reinicia a sessão inteira (não só a fase atual) — com o timer agora
  // persistente, é o único jeito do usuário "encerrar" e sumir com o
  // mini-widget do TopBar sem esperar o ciclo natural terminar.
  const reset = () => {
    setRunning(false);
    setPhaseEndAt(null);
    setPhase("focus");
    setCyclesCompleted(0);
    setPausedSecondsLeft(focusMin * 60);
  };

  const skipToBreak = () => transitionPhase("short-break", breakMin, running);
  const skipToFocus = () => transitionPhase("focus", focusMin, running);

  const isActive = running || cyclesCompleted > 0 || secondsLeft !== phaseDurationSeconds;

  const value: PomodoroContextValue = {
    phase,
    running,
    secondsLeft,
    phaseDurationSeconds,
    cyclesCompleted,
    isActive,
    focusMin,
    breakMin,
    longBreakMin,
    subjectId,
    topic,
    subjects: periodSubjects,
    // Reflete a duração editada no relógio parado na hora — mas só quando ela
    // é a da fase atual, e só fora de execução (os campos já ficam
    // desabilitados enquanto `running`). Feito no próprio setter (evento do
    // usuário), não num efeito reativo a [focusMin, ...]: um efeito desses
    // dispara de novo com o StrictMode do React em dev e sobrescreveria uma
    // sessão pausada reidratada do localStorage de volta pra duração cheia.
    setFocusMin: (min) => {
      const clamped = Math.max(1, min);
      setFocusMinState(clamped);
      if (!running && phase === "focus") setPausedSecondsLeft(clamped * 60);
    },
    setBreakMin: (min) => {
      const clamped = Math.max(1, min);
      setBreakMinState(clamped);
      if (!running && phase === "short-break") setPausedSecondsLeft(clamped * 60);
    },
    setLongBreakMin: (min) => {
      const clamped = Math.max(1, min);
      setLongBreakMinState(clamped);
      if (!running && phase === "long-break") setPausedSecondsLeft(clamped * 60);
    },
    setSubjectId,
    setTopic,
    start,
    pause,
    reset,
    skipToBreak,
    skipToFocus,
    lastSessionCreatedAt,
  };

  return <PomodoroContext.Provider value={value}>{children}</PomodoroContext.Provider>;
}

export function usePomodoro() {
  const ctx = useContext(PomodoroContext);
  if (!ctx) {
    throw new Error("usePomodoro precisa estar dentro de um PomodoroProvider");
  }
  return ctx;
}
