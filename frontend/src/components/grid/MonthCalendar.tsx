import { useState, type CSSProperties } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export type CalendarEvent = {
  date: string; // YYYY-MM-DD
  kind: "assignment" | "exam" | "lesson";
  title: string;
  subjectName: string;
  // lesson-only: presença desses campos habilita marcar/desmarcar falta.
  subjectId?: number;
  scheduleId?: number | null;
  markId?: number | null;
  markKind?: "falta" | "sem_aula" | null;
  startTime?: string;
  endTime?: string;
  // assignment/exam-only: presença de `id` habilita arrastar pra outro dia.
  id?: number;
  weight?: number;
  grade?: number | null;
};

const WEEKDAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
// Identifica o evento arrastado pelo próprio dataTransfer (kind+id), em vez de
// guardar em state — dragstart/drop podem disparar no mesmo tick, antes do
// React re-renderizar com um state atualizado.
const DRAG_MIME = "application/x-notary-calendar-event";

function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function MonthCalendar({
  events,
  onToggleLesson,
  onEventDrop,
  subjectColors,
  selectedDate,
  onSelectDate,
  isLessonPending,
}: {
  events: CalendarEvent[];
  onToggleLesson?: (event: CalendarEvent) => void;
  onEventDrop?: (event: CalendarEvent, newDate: string) => void;
  subjectColors?: Map<number, string>;
  selectedDate?: string | null;
  onSelectDate?: (date: string) => void;
  isLessonPending?: (event: CalendarEvent) => boolean;
}) {
  const [cursor, setCursor] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const startWeekday = firstOfMonth.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (Date | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);

  const eventsByDate = new Map<string, CalendarEvent[]>();
  for (const event of events) {
    const list = eventsByDate.get(event.date) ?? [];
    list.push(event);
    eventsByDate.set(event.date, list);
  }

  const todayKey = toDateKey(new Date());
  const monthLabel = cursor.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  return (
    <div className="month-calendar">
      <div className="month-calendar__header">
        <button
          type="button"
          className="icon-btn"
          aria-label="Mês anterior"
          onClick={() => setCursor(new Date(year, month - 1, 1))}
        >
          <ChevronLeft size={16} strokeWidth={2} />
        </button>
        <span className="month-calendar__label">{monthLabel}</span>
        <button
          type="button"
          className="icon-btn"
          aria-label="Próximo mês"
          onClick={() => setCursor(new Date(year, month + 1, 1))}
        >
          <ChevronRight size={16} strokeWidth={2} />
        </button>
      </div>

      <div className="month-calendar__weekdays">
        {WEEKDAY_LABELS.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>

      <div className="month-calendar__grid">
        {cells.map((date, index) => {
          if (!date) {
            return <div key={index} className="month-calendar__cell month-calendar__cell--empty" />;
          }
          const key = toDateKey(date);
          const dayEvents = eventsByDate.get(key) ?? [];
          const pillEvents = dayEvents.filter((e) => e.kind !== "lesson");
          const lessonEvents = dayEvents.filter((e) => e.kind === "lesson");
          return (
            <div
              key={key}
              className={`month-calendar__cell${key === todayKey ? " month-calendar__cell--today" : ""}${key === selectedDate ? " month-calendar__cell--selected" : ""}${onSelectDate ? " month-calendar__cell--clickable" : ""}`}
              onClick={onSelectDate ? () => onSelectDate(key) : undefined}
              onDragOver={
                onEventDrop
                  ? (ev) => {
                      ev.preventDefault();
                      ev.dataTransfer.dropEffect = "move";
                    }
                  : undefined
              }
              onDrop={
                onEventDrop
                  ? (ev) => {
                      ev.preventDefault();
                      try {
                        const { kind, id } = JSON.parse(ev.dataTransfer.getData(DRAG_MIME));
                        const dragged = events.find((e) => e.kind === kind && e.id === id);
                        if (dragged) onEventDrop(dragged, key);
                      } catch {
                        // payload ausente/inválido — nada a mover
                      }
                    }
                  : undefined
              }
            >
              <span className="month-calendar__day-number">{date.getDate()}</span>
              <div className="month-calendar__events">
                {pillEvents.slice(0, 3).map((event, i) => {
                  const canDrag = onEventDrop && event.id !== undefined;
                  const className = `month-calendar__event month-calendar__event--${event.kind}${canDrag ? " month-calendar__event--draggable" : ""}`;
                  const title = canDrag
                    ? `${event.title} — ${event.subjectName} (arraste pra outro dia pra mudar a data)`
                    : `${event.title} — ${event.subjectName}`;

                  return (
                    <span
                      key={i}
                      className={className}
                      title={title}
                      draggable={canDrag}
                      onDragStart={
                        canDrag
                          ? (ev) => {
                              ev.dataTransfer.effectAllowed = "move";
                              ev.dataTransfer.setData(DRAG_MIME, JSON.stringify({ kind: event.kind, id: event.id }));
                            }
                          : undefined
                      }
                    >
                      {event.title}
                    </span>
                  );
                })}
                {pillEvents.length > 3 && <span className="month-calendar__more">+{pillEvents.length - 3}</span>}
              </div>
              {lessonEvents.length > 0 && (
                <div className="month-calendar__lessons">
                  {lessonEvents.map((event, i) => {
                    const pending = isLessonPending?.(event) ?? false;
                    const canToggle = onToggleLesson && event.subjectId !== undefined && !pending;
                    const dotColor = event.subjectId !== undefined ? subjectColors?.get(event.subjectId) : undefined;
                    const stateClass =
                      event.markKind === "falta"
                        ? " month-calendar__lesson-dot--marked"
                        : event.markKind === "sem_aula"
                          ? " month-calendar__lesson-dot--no-class"
                          : "";
                    const title =
                      event.markKind === "falta"
                        ? `Falta marcada — ${event.title} — ${event.subjectName} (clique pra desmarcar)`
                        : event.markKind === "sem_aula"
                          ? `Sem aula — ${event.title} — ${event.subjectName} (clique pra desmarcar)`
                          : canToggle
                            ? `${event.title} — ${event.subjectName} (clique pra marcar falta)`
                            : `${event.title} — ${event.subjectName}`;

                    return (
                      <button
                        key={i}
                        type="button"
                        className={`month-calendar__lesson-dot${stateClass}${pending ? " month-calendar__lesson-dot--pending" : ""}`}
                        style={dotColor ? ({ "--dot-color": dotColor } as CSSProperties) : undefined}
                        title={title}
                        disabled={!canToggle}
                        onClick={canToggle ? () => onToggleLesson(event) : undefined}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
