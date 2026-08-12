import { useEffect, useState } from "react";
import { Play, Pause, RotateCcw } from "lucide-react";
import { Button } from "../ui/Button";
import type { Subject } from "../../api/types";

type Phase = "focus" | "short-break" | "long-break";

const PHASE_LABEL: Record<Phase, string> = {
  focus: "Foco",
  "short-break": "Pausa curta",
  "long-break": "Pausa longa",
};

function formatClock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function PomodoroTimer({
  subjects,
  onSessionComplete,
}: {
  subjects: Subject[];
  onSessionComplete: (input: { subjectId: number | null; topic: string; durationMinutes: number }) => void;
}) {
  const [focusMin, setFocusMin] = useState(25);
  const [breakMin, setBreakMin] = useState(5);
  const [longBreakMin, setLongBreakMin] = useState(15);

  const [phase, setPhase] = useState<Phase>("focus");
  const [secondsLeft, setSecondsLeft] = useState(focusMin * 60);
  const [running, setRunning] = useState(false);
  const [cyclesCompleted, setCyclesCompleted] = useState(0);

  const [subjectId, setSubjectId] = useState("");
  const [topic, setTopic] = useState("");

  const phaseDuration = phase === "focus" ? focusMin : phase === "short-break" ? breakMin : longBreakMin;

  useEffect(() => {
    if (running) return;
    setSecondsLeft(phaseDuration * 60);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusMin, breakMin, longBreakMin, phase]);

  useEffect(() => {
    if (!running) return;
    if (secondsLeft <= 0) {
      if (phase === "focus") {
        onSessionComplete({ subjectId: subjectId ? Number(subjectId) : null, topic: topic.trim(), durationMinutes: focusMin });
        const nextCycles = cyclesCompleted + 1;
        setCyclesCompleted(nextCycles);
        const isLong = nextCycles % 4 === 0;
        setPhase(isLong ? "long-break" : "short-break");
        setSecondsLeft((isLong ? longBreakMin : breakMin) * 60);
      } else {
        setPhase("focus");
        setSecondsLeft(focusMin * 60);
        setRunning(false);
      }
      return;
    }
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [running, secondsLeft]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleReset = () => {
    setRunning(false);
    setSecondsLeft(phaseDuration * 60);
  };

  const progressPct = ((phaseDuration * 60 - secondsLeft) / (phaseDuration * 60)) * 100;

  return (
    <div className="pomodoro">
      <div className="pomodoro__dots">
        {Array.from({ length: 4 }).map((_, i) => (
          <span key={i} className="pomodoro__dot" data-filled={i < (cyclesCompleted % 4 || (cyclesCompleted > 0 ? 4 : 0))} />
        ))}
      </div>

      <span className={`pomodoro__phase pomodoro__phase--${phase}`}>{PHASE_LABEL[phase]}</span>
      <div className="pomodoro__clock">{formatClock(secondsLeft)}</div>
      <div className="pomodoro__progress">
        <div className="pomodoro__progress-fill" style={{ width: `${progressPct}%` }} />
      </div>

      <div className="pomodoro__controls">
        <Button
          variant="primary"
          icon={running ? Pause : Play}
          onClick={() => setRunning((r) => !r)}
        >
          {running ? "Pausar" : "Iniciar"}
        </Button>
        <Button variant="ghost" icon={RotateCcw} onClick={handleReset}>
          Reiniciar
        </Button>
      </div>

      <div className="pomodoro__setup">
        <label className="field">
          <span className="field__label">Matéria (opcional)</span>
          <select
            className="field__input"
            value={subjectId}
            disabled={running}
            onChange={(e) => setSubjectId(e.target.value)}
          >
            <option value="">Sem matéria</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="field__label">Assunto (opcional)</span>
          <input
            className="field__input"
            value={topic}
            disabled={running}
            placeholder="ex: Integrais por partes"
            onChange={(e) => setTopic(e.target.value)}
          />
        </label>
      </div>

      {!subjectId && (
        <p className="pomodoro__hint">
          Sem matéria selecionada — a sessão é registrada mesmo assim, você pode vincular uma matéria depois no histórico.
        </p>
      )}

      <div className="pomodoro__durations">
        <label className="field field--tiny">
          <span className="field__label">Foco (min)</span>
          <input
            className="field__input"
            type="number"
            min="1"
            value={focusMin}
            disabled={running}
            onChange={(e) => setFocusMin(Math.max(1, Number(e.target.value) || 1))}
          />
        </label>
        <label className="field field--tiny">
          <span className="field__label">Pausa (min)</span>
          <input
            className="field__input"
            type="number"
            min="1"
            value={breakMin}
            disabled={running}
            onChange={(e) => setBreakMin(Math.max(1, Number(e.target.value) || 1))}
          />
        </label>
        <label className="field field--tiny">
          <span className="field__label">Pausa longa (min)</span>
          <input
            className="field__input"
            type="number"
            min="1"
            value={longBreakMin}
            disabled={running}
            onChange={(e) => setLongBreakMin(Math.max(1, Number(e.target.value) || 1))}
          />
        </label>
      </div>
    </div>
  );
}
