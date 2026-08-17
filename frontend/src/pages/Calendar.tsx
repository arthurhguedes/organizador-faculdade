import { Link } from "react-router-dom";
import { CalendarClock } from "lucide-react";
import { usePageTitle } from "../context/PageTitleContext";
import { usePeriods } from "../context/PeriodContext";
import { useDashboardData } from "../hooks/useDashboardData";
import { WeeklyGrid, type WeeklyGridBlock } from "../components/grid/WeeklyGrid";
import { MonthCalendar, type CalendarEvent } from "../components/grid/MonthCalendar";
import { PageHeader } from "../components/ui/PageHeader";
import { EmptyState } from "../components/ui/EmptyState";
import { SkeletonRows } from "../components/ui/Skeleton";
import { Button } from "../components/ui/Button";

export function Calendar() {
  usePageTitle("Calendário");
  const { selectedPeriod, selectedPeriodId, periods, loading: periodsLoading } = usePeriods();
  const { subjects, loading } = useDashboardData(selectedPeriodId !== null ? [selectedPeriodId] : []);

  if (!periodsLoading && periods.length === 0) {
    return (
      <EmptyState
        icon={CalendarClock}
        title="Nenhum período cadastrado ainda"
        description="Crie um período letivo para ver suas aulas e datas no calendário."
        action={
          <Link to="/periodos">
            <Button variant="primary">Criar período</Button>
          </Link>
        }
      />
    );
  }

  const weekBlocks: WeeklyGridBlock[] = subjects.flatMap((subject) =>
    subject.schedules.map((slot) => ({
      id: `${subject.id}-${slot.id}`,
      label: subject.name,
      weekday: slot.weekday,
      startTime: slot.startTime,
      endTime: slot.endTime,
      tone: "accent" as const,
    })),
  );

  const events: CalendarEvent[] = subjects.flatMap((subject) => [
    ...subject.assignments.map((a) => ({
      date: a.dueDate,
      kind: "assignment" as const,
      title: a.title,
      subjectName: subject.name,
    })),
    ...subject.exams.map((e) => ({
      date: e.date,
      kind: "exam" as const,
      title: e.title,
      subjectName: subject.name,
    })),
    ...subject.syllabusEntries.map((l) => ({
      date: l.date,
      kind: "lesson" as const,
      title: `Aula ${l.lessonNumber}: ${l.content}`,
      subjectName: subject.name,
    })),
  ]);

  return (
    <div>
      <PageHeader
        title="Calendário"
        description={`Aulas, atividades e provas de ${selectedPeriod?.label ?? "..."} em um só lugar.`}
      />

      {loading ? (
        <SkeletonRows rows={6} />
      ) : (
        <div className="calendar-layout">
          <section>
            <h3 className="calendar-layout__heading">Aulas da semana</h3>
            {weekBlocks.length === 0 ? (
              <EmptyState icon={CalendarClock} title="Nenhum horário de aula cadastrado ainda" />
            ) : (
              <WeeklyGrid blocks={weekBlocks} />
            )}
          </section>

          <section>
            <h3 className="calendar-layout__heading">Provas, atividades e aulas</h3>
            <MonthCalendar events={events} />
          </section>
        </div>
      )}
    </div>
  );
}
