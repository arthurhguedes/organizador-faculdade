import { Flame } from "lucide-react";
import type { LevelInfo, StreakState, WeekDay } from "../../lib/gamification";

const WEEKDAY_LABELS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

export function ProgressBoard({
  streak,
  weekActivity,
  xp,
  level,
}: {
  streak: StreakState;
  weekActivity: WeekDay[];
  xp: number;
  level: LevelInfo;
}) {
  const active = streak.current > 0;
  const activeDays = weekActivity.filter((day) => day.active).length;

  return (
    <div className="progress-board">
      <div className="progress-board__streak">
        <div className="progress-board__streak-count" data-active={active}>
          <Flame size={18} strokeWidth={2} />
          <span>{streak.current}</span>
        </div>
        <p className="progress-board__streak-label">
          {streak.current === 1 ? "dia seguido" : "dias seguidos"}
        </p>
        <div
          className="progress-board__week"
          role="img"
          aria-label={`Últimos 7 dias: ${activeDays} de 7 dias com uso do app`}
        >
          {weekActivity.map((day) => (
            <span
              key={day.key}
              className="progress-board__week-dot"
              data-active={day.active}
              data-today={day.isToday}
              title={WEEKDAY_LABELS[day.weekday === 0 ? 6 : day.weekday - 1]}
            />
          ))}
        </div>
        <p className="progress-board__streak-best">
          Recorde: {streak.best} {streak.best === 1 ? "dia" : "dias"}
        </p>
      </div>

      <div className="progress-board__level">
        <div className="progress-board__level-top">
          <span className="progress-board__level-name">{level.name}</span>
          <span className="progress-board__xp">
            {xp} XP{level.nextThreshold !== null ? ` · ${level.nextThreshold - xp} para o próximo nível` : ""}
          </span>
        </div>
        <div className="xp-bar">
          <div className="xp-bar__fill" style={{ width: `${level.progressPct}%` }} />
        </div>
      </div>
    </div>
  );
}
