const DAY_LABELS: Record<string, string> = {
  segunda: "Seg",
  terça: "Ter",
  quarta: "Qua",
  quinta: "Qui",
  sexta: "Sex",
  sábado: "Sáb",
};

const DEFAULT_WEEKDAYS = ["segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

const GRID_START_MIN = 7 * 60;
const GRID_END_MIN = 23 * 60;
const GRID_SPAN_MIN = GRID_END_MIN - GRID_START_MIN;

export type WeeklyGridBlock = {
  id: string | number;
  label: string;
  sublabel?: string;
  weekday: string;
  startTime: string;
  endTime: string;
  tone?: "accent" | "danger" | "neutral";
};

function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

export function WeeklyGrid({
  blocks,
  weekdays = DEFAULT_WEEKDAYS,
}: {
  blocks: WeeklyGridBlock[];
  weekdays?: string[];
}) {
  const hourMarks = Array.from({ length: GRID_SPAN_MIN / 60 + 1 }, (_, i) => 7 + i);

  return (
    <div className="weekly-grid" style={{ gridTemplateColumns: `44px repeat(${weekdays.length}, 1fr)` }}>
      <div className="weekly-grid__corner" />
      {weekdays.map((day) => (
        <div key={day} className="weekly-grid__day-header">
          {DAY_LABELS[day] ?? day}
        </div>
      ))}

      <div className="weekly-grid__gutter">
        {hourMarks.map((hour) => (
          <span
            key={hour}
            className="weekly-grid__hour-label"
            style={{ top: `${((hour * 60 - GRID_START_MIN) / GRID_SPAN_MIN) * 100}%` }}
          >
            {String(hour).padStart(2, "0")}h
          </span>
        ))}
      </div>

      {weekdays.map((day) => (
        <div key={day} className="weekly-grid__day-body">
          {blocks
            .filter((block) => block.weekday === day)
            .map((block) => {
              const top = ((toMinutes(block.startTime) - GRID_START_MIN) / GRID_SPAN_MIN) * 100;
              const height = ((toMinutes(block.endTime) - toMinutes(block.startTime)) / GRID_SPAN_MIN) * 100;
              return (
                <div
                  key={block.id}
                  className={`weekly-grid__block weekly-grid__block--${block.tone ?? "accent"}`}
                  style={{ top: `${top}%`, height: `${Math.max(height, 3)}%` }}
                  title={`${block.label} · ${block.startTime}–${block.endTime}`}
                >
                  <span className="weekly-grid__block-label">{block.label}</span>
                  {block.sublabel && <span className="weekly-grid__block-sublabel">{block.sublabel}</span>}
                </div>
              );
            })}
        </div>
      ))}
    </div>
  );
}
