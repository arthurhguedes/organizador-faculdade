import { X } from "lucide-react";
import type { CSSProperties } from "react";
import { Badge } from "../ui/Badge";
import type { CalendarEvent } from "./MonthCalendar";

type LessonState = "presente" | "falta" | "sem_aula";

function lessonState(event: CalendarEvent): LessonState {
  if (event.markKind === "falta") return "falta";
  if (event.markKind === "sem_aula") return "sem_aula";
  return "presente";
}

function formatDayLabel(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  const label = new Date(year, month - 1, day).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function DayDetailPanel({
  date,
  lessons,
  otherEvents,
  subjectColors,
  onSetLessonState,
  isPending,
  onClose,
}: {
  date: string;
  lessons: CalendarEvent[];
  otherEvents: CalendarEvent[];
  subjectColors?: Map<number, string>;
  onSetLessonState: (event: CalendarEvent, state: LessonState) => void;
  isPending?: (event: CalendarEvent) => boolean;
  onClose: () => void;
}) {
  return (
    <div className="day-panel">
      <div className="day-panel__header">
        <h4>{formatDayLabel(date)}</h4>
        <button type="button" className="icon-btn" aria-label="Fechar" onClick={onClose}>
          <X size={16} strokeWidth={2} />
        </button>
      </div>

      {otherEvents.length > 0 && (
        <div className="day-panel__events">
          {otherEvents.map((event, i) => (
            <div key={i} className="day-panel__event-row">
              <Badge tone={event.kind === "exam" ? "accent" : "neutral"}>
                {event.kind === "exam" ? "Prova" : "Atividade"}
              </Badge>
              <span>
                {event.title} — {event.subjectName}
              </span>
            </div>
          ))}
        </div>
      )}

      {lessons.length === 0 ? (
        otherEvents.length === 0 && <p className="day-panel__empty">Nenhuma aula, prova ou atividade nesse dia.</p>
      ) : (
        <div className="day-panel__lessons">
          {lessons.map((event, i) => {
            const state = lessonState(event);
            const pending = isPending?.(event) ?? false;
            const dotColor = event.subjectId !== undefined ? subjectColors?.get(event.subjectId) : undefined;
            return (
              <div key={i} className="day-panel__lesson-row">
                <span className="day-panel__lesson-subject">
                  <span
                    className="day-panel__lesson-swatch"
                    style={dotColor ? ({ "--dot-color": dotColor } as CSSProperties) : undefined}
                  />
                  {event.subjectName}
                  {event.startTime && event.endTime && (
                    <span className="day-panel__lesson-time">
                      {event.startTime}–{event.endTime}
                    </span>
                  )}
                </span>
                <div className={`day-panel__state-group${pending ? " day-panel__state-group--pending" : ""}`}>
                  {(
                    [
                      ["presente", "Presente"],
                      ["falta", "Faltei"],
                      ["sem_aula", "Sem aula"],
                    ] as [LessonState, string][]
                  ).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      className={`day-panel__state-btn${state === value ? " day-panel__state-btn--active" : ""} day-panel__state-btn--${value}`}
                      disabled={pending}
                      onClick={() => onSetLessonState(event, value)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
