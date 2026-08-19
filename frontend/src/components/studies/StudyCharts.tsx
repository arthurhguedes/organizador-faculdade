import { useState } from "react";
import type { StudySession } from "../../api/types";
import { addDaysISO, formatHours, todayISO } from "../../lib/grades";

const DAYS = 14;
const VIEW_W = 700;
const VIEW_H = 132;
const PAD_X = 4;
const PLOT_TOP = 10;
const BASELINE_Y = 92;
const LABEL_Y = 112;
const BAR_MAX_WIDTH = 22;
const RADIUS = 4;

const WEEKDAY_SHORT = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

function roundedTopBarPath(x: number, width: number, top: number, bottom: number): string {
  const r = Math.min(RADIUS, (bottom - top) / 2, width / 2);
  if (r <= 0) {
    return `M${x},${bottom} L${x},${top} L${x + width},${top} L${x + width},${bottom} Z`;
  }
  return [
    `M${x},${bottom}`,
    `L${x},${top + r}`,
    `Q${x},${top} ${x + r},${top}`,
    `L${x + width - r},${top}`,
    `Q${x + width},${top} ${x + width},${top + r}`,
    `L${x + width},${bottom}`,
    "Z",
  ].join(" ");
}

export function DailyTrendChart({ sessions }: { sessions: StudySession[] }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const today = todayISO();

  const days = Array.from({ length: DAYS }, (_, i) => addDaysISO(today, i - (DAYS - 1)));
  const minutesByDay = days.map((day) =>
    sessions.filter((s) => s.date === day).reduce((sum, s) => sum + s.durationMinutes, 0),
  );
  const maxMinutes = Math.max(1, ...minutesByDay);

  const slotWidth = (VIEW_W - PAD_X * 2) / DAYS;
  const barWidth = Math.min(BAR_MAX_WIDTH, slotWidth - 12);
  const plotHeight = BASELINE_Y - PLOT_TOP;

  const hoveredDay = hovered !== null ? days[hovered] : null;
  const hoveredMinutes = hovered !== null ? minutesByDay[hovered] : null;

  return (
    <div className="study-chart">
      <div className="study-chart__header">
        <h4>Tendência diária</h4>
        <span className="study-chart__hint">últimos 14 dias</span>
      </div>
      <div className="study-chart__svg-wrap">
        <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} className="study-chart__svg" role="img" aria-label="Minutos estudados por dia, últimos 14 dias">
          <line x1={PAD_X} y1={BASELINE_Y} x2={VIEW_W - PAD_X} y2={BASELINE_Y} className="study-chart__baseline" />
          {days.map((day, i) => {
            const minutes = minutesByDay[i];
            const slotX = PAD_X + i * slotWidth;
            const barX = slotX + (slotWidth - barWidth) / 2;
            const barHeight = (minutes / maxMinutes) * plotHeight;
            const top = BASELINE_Y - barHeight;
            const isToday = day === today;
            const dayNum = Number(day.slice(8, 10));

            return (
              <g
                key={day}
                tabIndex={0}
                role="img"
                aria-label={`${WEEKDAY_SHORT[new Date(`${day}T00:00:00`).getDay()]} ${dayNum}: ${formatHours(minutes)}`}
                className="study-chart__bar-group"
                onPointerEnter={() => setHovered(i)}
                onPointerLeave={() => setHovered((h) => (h === i ? null : h))}
                onFocus={() => setHovered(i)}
                onBlur={() => setHovered((h) => (h === i ? null : h))}
              >
                <rect x={slotX} y={PLOT_TOP} width={slotWidth} height={plotHeight} fill="transparent" />
                {minutes > 0 && (
                  <path
                    d={roundedTopBarPath(barX, barWidth, top, BASELINE_Y)}
                    className="study-chart__bar"
                    data-hovered={hovered === i}
                  />
                )}
                <text x={slotX + slotWidth / 2} y={LABEL_Y} textAnchor="middle" className="study-chart__tick" data-today={isToday}>
                  {isToday ? "hoje" : dayNum}
                </text>
              </g>
            );
          })}
        </svg>
        {hoveredDay !== null && hoveredMinutes !== null && (
          <div className="study-chart__tooltip" style={{ left: `${((hovered! + 0.5) / DAYS) * 100}%` }}>
            <strong>{formatHours(hoveredMinutes)}</strong>
            <span>
              {WEEKDAY_SHORT[new Date(`${hoveredDay}T00:00:00`).getDay()]}, {Number(hoveredDay.slice(8, 10))}/
              {Number(hoveredDay.slice(5, 7))}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
