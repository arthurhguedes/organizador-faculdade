import { useEffect, useMemo, useState } from "react";

const DAY_LABELS: Record<string, string> = {
  segunda: "Seg",
  terça: "Ter",
  quarta: "Qua",
  quinta: "Qui",
  sexta: "Sex",
  sábado: "Sáb",
};

const WEEKDAY_BY_JS_DAY: Record<number, string> = {
  0: "domingo",
  1: "segunda",
  2: "terça",
  3: "quarta",
  4: "quinta",
  5: "sexta",
  6: "sábado",
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

type LaidOutBlock = WeeklyGridBlock & { col: number; cols: number };

function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

function formatTimeRange(startTime: string, endTime: string): string {
  return `${startTime.slice(0, 5)}–${endTime.slice(0, 5)}`;
}

// Sweeps each day's blocks left-to-right in time order, packing overlapping
// ones into side-by-side columns (classic calendar layout) instead of
// letting them render stacked directly on top of each other.
function layoutDay(blocks: WeeklyGridBlock[]): LaidOutBlock[] {
  const sorted = [...blocks].sort(
    (a, b) => toMinutes(a.startTime) - toMinutes(b.startTime) || toMinutes(a.endTime) - toMinutes(b.endTime),
  );

  const result: LaidOutBlock[] = [];
  let cluster: { block: WeeklyGridBlock; col: number }[] = [];
  let columnEnds: number[] = [];
  let clusterEnd = -Infinity;

  const flushCluster = () => {
    if (cluster.length === 0) return;
    const cols = Math.max(...cluster.map((c) => c.col)) + 1;
    for (const { block, col } of cluster) {
      result.push({ ...block, col, cols });
    }
    cluster = [];
  };

  for (const block of sorted) {
    const start = toMinutes(block.startTime);
    const end = toMinutes(block.endTime);

    if (start >= clusterEnd) {
      flushCluster();
      columnEnds = [];
      clusterEnd = -Infinity;
    }

    let col = columnEnds.findIndex((endMin) => endMin <= start);
    if (col === -1) {
      col = columnEnds.length;
      columnEnds.push(end);
    } else {
      columnEnds[col] = end;
    }

    cluster.push({ block, col });
    clusterEnd = Math.max(clusterEnd, end);
  }
  flushCluster();

  return result;
}

// Minimum vertical gap (in % of the grid's time span) between two side labels
// before the later one is dropped, so two classes starting a few minutes
// apart don't render overlapping text in the gutter.
const MIN_LABEL_GAP_PERCENT = 2.2;

// The gutter labels the exact start time of every scheduled block instead of
// a generic 07h/08h/09h ruler, so "starts at 8:20" reads as "8:20" on the
// side, not as a guess at where 8:20 falls between two round hours.
function getStartTimeMarks(blocks: WeeklyGridBlock[]): { minutes: number; label: string }[] {
  const uniqueMinutes = new Map<number, string>();
  for (const block of blocks) {
    const minutes = toMinutes(block.startTime);
    if (minutes < GRID_START_MIN || minutes > GRID_END_MIN) continue;
    if (!uniqueMinutes.has(minutes)) uniqueMinutes.set(minutes, block.startTime.slice(0, 5));
  }

  const sorted = [...uniqueMinutes.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([minutes, label]) => ({ minutes, label }));

  const spaced: { minutes: number; label: string }[] = [];
  let lastPercent = -Infinity;
  for (const mark of sorted) {
    const percent = ((mark.minutes - GRID_START_MIN) / GRID_SPAN_MIN) * 100;
    if (percent - lastPercent < MIN_LABEL_GAP_PERCENT) continue;
    spaced.push(mark);
    lastPercent = percent;
  }

  return spaced;
}

export function WeeklyGrid({
  blocks,
  weekdays = DEFAULT_WEEKDAYS,
}: {
  blocks: WeeklyGridBlock[];
  weekdays?: string[];
}) {
  const sideMarks = useMemo(() => getStartTimeMarks(blocks), [blocks]);

  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const todayWeekday = WEEKDAY_BY_JS_DAY[now.getDay()];
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const showNowLine = weekdays.includes(todayWeekday) && nowMinutes >= GRID_START_MIN && nowMinutes <= GRID_END_MIN;
  const nowTop = ((nowMinutes - GRID_START_MIN) / GRID_SPAN_MIN) * 100;

  const blocksByDay = useMemo(() => {
    const map = new Map<string, LaidOutBlock[]>();
    for (const day of weekdays) {
      map.set(day, layoutDay(blocks.filter((block) => block.weekday === day)));
    }
    return map;
  }, [blocks, weekdays]);

  return (
    <div className="weekly-grid" style={{ gridTemplateColumns: `58px repeat(${weekdays.length}, minmax(64px, 1fr))` }}>
      <div className="weekly-grid__corner" />
      {weekdays.map((day) => (
        <div
          key={day}
          className={`weekly-grid__day-header${day === todayWeekday ? " weekly-grid__day-header--today" : ""}`}
        >
          {DAY_LABELS[day] ?? day}
        </div>
      ))}

      <div className="weekly-grid__gutter">
        {sideMarks.map((mark) => (
          <span
            key={mark.minutes}
            className="weekly-grid__hour-label"
            style={{ top: `${((mark.minutes - GRID_START_MIN) / GRID_SPAN_MIN) * 100}%` }}
          >
            {mark.label}
          </span>
        ))}
      </div>

      {weekdays.map((day) => (
        <div
          key={day}
          className={`weekly-grid__day-body${day === todayWeekday ? " weekly-grid__day-body--today" : ""}`}
        >
          {(blocksByDay.get(day) ?? []).map((block) => {
            const top = ((toMinutes(block.startTime) - GRID_START_MIN) / GRID_SPAN_MIN) * 100;
            const height = ((toMinutes(block.endTime) - toMinutes(block.startTime)) / GRID_SPAN_MIN) * 100;
            const width = 100 / block.cols;
            const left = block.col * width;
            const timeRange = formatTimeRange(block.startTime, block.endTime);

            return (
              <div
                key={block.id}
                className={`weekly-grid__block weekly-grid__block--${block.tone ?? "accent"}`}
                style={{
                  top: `${top}%`,
                  height: `${Math.max(height, 3)}%`,
                  left: `calc(${left}% + 2px)`,
                  width: `calc(${width}% - 4px)`,
                }}
                title={`${block.label} · ${timeRange}`}
              >
                <span className="weekly-grid__block-label">{block.label}</span>
                <span className="weekly-grid__block-meta">
                  {timeRange}
                  {block.sublabel ? ` · ${block.sublabel}` : ""}
                </span>
              </div>
            );
          })}

          {day === todayWeekday && showNowLine && (
            <div className="weekly-grid__now-line" style={{ top: `${nowTop}%` }}>
              <span className="weekly-grid__now-dot" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
