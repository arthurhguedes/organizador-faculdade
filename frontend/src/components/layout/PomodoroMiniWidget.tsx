import { Link } from "react-router-dom";
import { Pause, Play, Timer } from "lucide-react";
import { usePomodoro } from "../../context/PomodoroContext";

const PHASE_LABEL: Record<string, string> = {
  focus: "Foco",
  "short-break": "Pausa",
  "long-break": "Pausa longa",
};

function formatClock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function PomodoroMiniWidget() {
  const { isActive, phase, running, secondsLeft, pause, start } = usePomodoro();

  if (!isActive) return null;

  return (
    <Link
      to="/estudos"
      className="pomodoro-mini"
      data-phase={phase}
      title={`Pomodoro em andamento — ${PHASE_LABEL[phase]}, ${formatClock(secondsLeft)} restantes`}
    >
      <Timer size={15} strokeWidth={2} className="pomodoro-mini__icon" />
      <span className="pomodoro-mini__phase">{PHASE_LABEL[phase]}</span>
      <span className="pomodoro-mini__clock">{formatClock(secondsLeft)}</span>
      <button
        type="button"
        className="pomodoro-mini__toggle"
        aria-label={running ? "Pausar Pomodoro" : "Retomar Pomodoro"}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (running) pause();
          else start();
        }}
      >
        {running ? <Pause size={13} strokeWidth={2} /> : <Play size={13} strokeWidth={2} />}
      </button>
    </Link>
  );
}
