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

// Fallback range used only when a grid somehow renders with no blocks at all
// (every call site already swaps in an EmptyState before that happens).
const FALLBACK_START_MIN = 8 * 60;
const FALLBACK_END_MIN = 22 * 60;

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

// UFOP schedules classes in back-to-back 50min periods (e.g. 08:20–09:10 +
// 09:20–10:10) that are really a single class session with a short break
// baked into the two DB rows. Anything within this gap, same subject/day,
// gets merged into one visual block instead of rendering as two stacked ones.
const MERGE_GAP_MIN = 20;

function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

function formatTimeRange(startTime: string, endTime: string): string {
  return `${startTime.slice(0, 5)}–${endTime.slice(0, 5)}`;
}

function formatHourLabel(minutes: number): string {
  const h = Math.floor(minutes / 60)
    .toString()
    .padStart(2, "0");
  const m = (minutes % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

// Collapses consecutive blocks of the same subject/turma on the same day
// into one when the gap between them is small, so a paired class shows up
// as a single "08:20–10:10" block instead of two separate ones with a seam.
function mergeAdjacentBlocks(blocks: WeeklyGridBlock[]): WeeklyGridBlock[] {
  const groups = new Map<string, WeeklyGridBlock[]>();
  for (const block of blocks) {
    const key = `${block.weekday}|${block.label}|${block.sublabel ?? ""}|${block.tone ?? "accent"}`;
    const group = groups.get(key);
    if (group) group.push(block);
    else groups.set(key, [block]);
  }

  const merged: WeeklyGridBlock[] = [];
  for (const group of groups.values()) {
    const sorted = [...group].sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime));
    let current = sorted[0];
    for (let i = 1; i < sorted.length; i++) {
      const next = sorted[i];
      if (toMinutes(next.startTime) - toMinutes(current.endTime) <= MERGE_GAP_MIN) {
        current = { ...current, endTime: next.endTime };
      } else {
        merged.push(current);
        current = next;
      }
    }
    merged.push(current);
  }
  return merged;
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

type Row = { startMin: number; endMin: number; hasClass: boolean };

// Every row — whether it holds a class or not — gets this same height. A
// 10min gap between two periods and a 90min lunch break both read as "one
// row", and an hour of class reads the same width as an hour of nothing:
// a real "grade de horários" table, not a clock rendered to scale.
const ROW_HEIGHT_PX = 56;
// Rows always reach at least this late, in plain hourly slots, so the
// evening has room on the grid even on a semester with no night classes.
const EVENING_CUTOFF_MIN = 22 * 60;

function nextRoundHour(minutes: number): number {
  const rounded = Math.ceil(minutes / 60) * 60;
  return rounded > minutes ? rounded : minutes + 60;
}

// Turns the week's classes into a fixed row table: every distinct start/end
// time anyone's class uses becomes a row boundary (so a block always spans
// whole rows, never a fraction of one), rows with no class anywhere in the
// week that day are marked as such, and the table is padded out with plain
// hourly rows through the evening.
function buildRows(mergedBlocks: WeeklyGridBlock[]): Row[] {
  if (mergedBlocks.length === 0) {
    const rows: Row[] = [];
    for (let m = FALLBACK_START_MIN; m < FALLBACK_END_MIN; m += 60) {
      rows.push({ startMin: m, endMin: Math.min(m + 60, FALLBACK_END_MIN), hasClass: false });
    }
    return rows;
  }

  const boundarySet = new Set<number>();
  for (const block of mergedBlocks) {
    boundarySet.add(toMinutes(block.startTime));
    boundarySet.add(toMinutes(block.endTime));
  }
  const boundaries = [...boundarySet].sort((a, b) => a - b);

  const rows: Row[] = [];
  for (let i = 0; i < boundaries.length - 1; i++) {
    const startMin = boundaries[i];
    const endMin = boundaries[i + 1];
    const hasClass = mergedBlocks.some((b) => toMinutes(b.startTime) <= startMin && toMinutes(b.endTime) >= endMin);
    rows.push({ startMin, endMin, hasClass });
  }

  let cursor = boundaries[boundaries.length - 1];
  while (cursor < EVENING_CUTOFF_MIN) {
    const next = Math.min(nextRoundHour(cursor), EVENING_CUTOFF_MIN);
    rows.push({ startMin: cursor, endMin: next, hasClass: false });
    cursor = next;
  }

  return rows;
}

// A block's start/end are always exact row boundaries by construction, so
// this only ever walks forward to find how many whole rows it spans.
function findRowSpan(block: WeeklyGridBlock, rows: Row[]): { top: number; height: number } {
  const blockStart = toMinutes(block.startTime);
  const blockEnd = toMinutes(block.endTime);
  const startIdx = rows.findIndex((row) => row.startMin === blockStart);
  if (startIdx === -1) return { top: 0, height: ROW_HEIGHT_PX };

  let endIdx = startIdx;
  while (endIdx < rows.length - 1 && rows[endIdx].endMin < blockEnd) endIdx++;

  return { top: startIdx * ROW_HEIGHT_PX, height: (endIdx - startIdx + 1) * ROW_HEIGHT_PX };
}

export function WeeklyGrid({
  blocks,
  weekdays = DEFAULT_WEEKDAYS,
}: {
  blocks: WeeklyGridBlock[];
  weekdays?: string[];
}) {
  const mergedBlocks = useMemo(() => mergeAdjacentBlocks(blocks), [blocks]);
  const rows = useMemo(() => buildRows(mergedBlocks), [mergedBlocks]);
  const bodyHeight = rows.length * ROW_HEIGHT_PX;

  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const todayWeekday = WEEKDAY_BY_JS_DAY[now.getDay()];
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const nowRowIndex = rows.findIndex((row) => nowMinutes >= row.startMin && nowMinutes < row.endMin);
  const showNowLine = weekdays.includes(todayWeekday) && nowRowIndex !== -1;
  const nowTop = showNowLine
    ? nowRowIndex * ROW_HEIGHT_PX +
      ((nowMinutes - rows[nowRowIndex].startMin) / (rows[nowRowIndex].endMin - rows[nowRowIndex].startMin)) * ROW_HEIGHT_PX
    : 0;

  const blocksByDay = useMemo(() => {
    const map = new Map<string, LaidOutBlock[]>();
    for (const day of weekdays) {
      map.set(day, layoutDay(mergedBlocks.filter((block) => block.weekday === day)));
    }
    return map;
  }, [mergedBlocks, weekdays]);

  return (
    <div className="weekly-grid-scroll">
      <div className="weekly-grid" style={{ gridTemplateColumns: `52px repeat(${weekdays.length}, minmax(64px, 1fr))` }}>
        <div className="weekly-grid__corner" />
        {weekdays.map((day) => (
          <div
            key={day}
            className={`weekly-grid__day-header${day === todayWeekday ? " weekly-grid__day-header--today" : ""}`}
          >
            {DAY_LABELS[day] ?? day}
          </div>
        ))}

        <div className="weekly-grid__gutter" style={{ height: `${bodyHeight}px` }}>
          {rows.map((row, index) => (
            <div
              key={row.startMin}
              className={`weekly-grid__row${row.hasClass ? "" : " weekly-grid__row--empty"}`}
              style={{ top: `${index * ROW_HEIGHT_PX}px`, height: `${ROW_HEIGHT_PX}px` }}
            >
              <span className="weekly-grid__hour-label weekly-grid__hour-label--start">{formatHourLabel(row.startMin)}</span>
              <span className="weekly-grid__hour-label weekly-grid__hour-label--end">{formatHourLabel(row.endMin)}</span>
            </div>
          ))}
        </div>

        {weekdays.map((day) => (
          <div
            key={day}
            className={`weekly-grid__day-body${day === todayWeekday ? " weekly-grid__day-body--today" : ""}`}
            style={{ height: `${bodyHeight}px` }}
          >
            {rows.map((row, index) => (
              <div
                key={row.startMin}
                className={`weekly-grid__row${row.hasClass ? "" : " weekly-grid__row--empty"}`}
                style={{ top: `${index * ROW_HEIGHT_PX}px`, height: `${ROW_HEIGHT_PX}px` }}
              />
            ))}

            {(blocksByDay.get(day) ?? []).map((block) => {
              const { top, height } = findRowSpan(block, rows);
              const width = 100 / block.cols;
              const left = block.col * width;
              const timeRange = formatTimeRange(block.startTime, block.endTime);

              return (
                <div
                  key={block.id}
                  className={`weekly-grid__block weekly-grid__block--${block.tone ?? "accent"}`}
                  style={{
                    top: `${top}px`,
                    height: `${height}px`,
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
              <div className="weekly-grid__now-line" style={{ top: `${nowTop}px` }}>
                <span className="weekly-grid__now-dot" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
