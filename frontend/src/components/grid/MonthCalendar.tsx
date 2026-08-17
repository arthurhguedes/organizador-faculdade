import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export type CalendarEvent = {
  date: string; // YYYY-MM-DD
  kind: "assignment" | "exam" | "lesson";
  title: string;
  subjectName: string;
};

const WEEKDAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function MonthCalendar({ events }: { events: CalendarEvent[] }) {
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
            <div key={key} className={`month-calendar__cell${key === todayKey ? " month-calendar__cell--today" : ""}`}>
              <span className="month-calendar__day-number">{date.getDate()}</span>
              <div className="month-calendar__events">
                {dayEvents.slice(0, 3).map((event, i) => (
                  <span
                    key={i}
                    className={`month-calendar__event month-calendar__event--${event.kind}`}
                    title={`${event.title} — ${event.subjectName}`}
                  >
                    {event.title}
                  </span>
                ))}
                {dayEvents.length > 3 && <span className="month-calendar__more">+{dayEvents.length - 3}</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
