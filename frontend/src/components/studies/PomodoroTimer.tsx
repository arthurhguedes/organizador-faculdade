import { Play, Pause, RotateCcw, SkipForward } from "lucide-react";
import { Button } from "../ui/Button";
import { usePomodoro, type PomodoroPhase } from "../../context/PomodoroContext";

const PHASE_LABEL: Record<PomodoroPhase, string> = {
  focus: "Foco",
  "short-break": "Pausa curta",
  "long-break": "Pausa longa",
};

function formatClock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function PomodoroTimer() {
  const {
    phase,
    running,
    secondsLeft,
    phaseDurationSeconds,
    cyclesCompleted,
    focusMin,
    breakMin,
    longBreakMin,
    subjectId,
    topic,
    subjects,
    setFocusMin,
    setBreakMin,
    setLongBreakMin,
    setSubjectId,
    setTopic,
    start,
    pause,
    reset,
    skipToBreak,
    skipToFocus,
  } = usePomodoro();

  const progressPct = ((phaseDurationSeconds - secondsLeft) / phaseDurationSeconds) * 100;

  return (
    <div className="pomodoro">
      <div className="pomodoro__meta">
        <span className={`pomodoro__phase pomodoro__phase--${phase}`}>{PHASE_LABEL[phase]}</span>
        <div className="pomodoro__dots" title={`${cyclesCompleted % 4 || (cyclesCompleted > 0 ? 4 : 0)} de 4 ciclos até a pausa longa`}>
          {Array.from({ length: 4 }).map((_, i) => (
            <span key={i} className="pomodoro__dot" data-filled={i < (cyclesCompleted % 4 || (cyclesCompleted > 0 ? 4 : 0))} />
          ))}
        </div>
      </div>

      <div className="pomodoro__clock">{formatClock(secondsLeft)}</div>
      <div className="pomodoro__progress">
        <div className="pomodoro__progress-fill" style={{ width: `${progressPct}%` }} />
      </div>

      <div className="pomodoro__controls">
        <Button variant="primary" icon={running ? Pause : Play} onClick={() => (running ? pause() : start())}>
          {running ? "Pausar" : "Iniciar"}
        </Button>
        <Button variant="ghost" icon={RotateCcw} onClick={reset}>
          Reiniciar
        </Button>
        {phase === "focus" ? (
          <Button variant="ghost" icon={SkipForward} onClick={skipToBreak}>
            Pular pro descanso
          </Button>
        ) : (
          <Button variant="ghost" icon={SkipForward} onClick={skipToFocus}>
            Voltar pro foco
          </Button>
        )}
      </div>

      <div className="pomodoro__section">
        <span className="pomodoro__section-label">Sessão de estudo</span>
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
      </div>

      <div className="pomodoro__section">
        <span className="pomodoro__section-label">Duração dos ciclos (min)</span>
        <div className="pomodoro__durations">
          <label className="field field--tiny">
            <span className="field__label">Foco</span>
            <input
              className="field__input"
              type="number"
              min="1"
              value={focusMin}
              disabled={running}
              onChange={(e) => setFocusMin(Number(e.target.value) || 1)}
            />
          </label>
          <label className="field field--tiny">
            <span className="field__label">Pausa</span>
            <input
              className="field__input"
              type="number"
              min="1"
              value={breakMin}
              disabled={running}
              onChange={(e) => setBreakMin(Number(e.target.value) || 1)}
            />
          </label>
          <label className="field field--tiny">
            <span className="field__label">Pausa longa</span>
            <input
              className="field__input"
              type="number"
              min="1"
              value={longBreakMin}
              disabled={running}
              onChange={(e) => setLongBreakMin(Number(e.target.value) || 1)}
            />
          </label>
        </div>
      </div>
    </div>
  );
}
