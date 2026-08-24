import { useState } from "react";
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
}: {
  events: CalendarEvent[];
  onToggleLesson?: (event: CalendarEvent) => void;
  onEventDrop?: (event: CalendarEvent, newDate: string) => void;
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
          return (
            <div
              key={key}
              className={`month-calendar__cell${key === todayKey ? " month-calendar__cell--today" : ""}`}
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
                {dayEvents.slice(0, 3).map((event, i) => {
                  const canToggle = onToggleLesson && event.kind === "lesson" && event.subjectId !== undefined;
                  const canDrag = onEventDrop && event.kind !== "lesson" && event.id !== undefined;
                  const marked = Boolean(event.markId);
                  const className = `month-calendar__event month-calendar__event--${event.kind}${marked ? " month-calendar__event--marked" : ""}${canDrag ? " month-calendar__event--draggable" : ""}`;
                  const title = marked
                    ? `Falta marcada — ${event.title} — ${event.subjectName} (clique pra desmarcar)`
                    : canToggle
                      ? `${event.title} — ${event.subjectName} (clique pra marcar falta)`
                      : canDrag
                        ? `${event.title} — ${event.subjectName} (arraste pra outro dia pra mudar a data)`
                        : `${event.title} — ${event.subjectName}`;

                  if (canToggle) {
                    return (
                      <button
                        key={i}
                        type="button"
                        className={className}
                        title={title}
                        onClick={() => onToggleLesson(event)}
                      >
                        {event.title}
                      </button>
                    );
                  }
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
                {dayEvents.length > 3 && <span className="month-calendar__more">+{dayEvents.length - 3}</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
