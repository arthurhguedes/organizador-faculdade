import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarClock } from "lucide-react";
import { usePageTitle } from "../context/PageTitleContext";
import { usePeriods } from "../context/PeriodContext";
import { useDashboardData } from "../hooks/useDashboardData";
import { attendanceMarksApi, ApiError } from "../api/client";
import type { AttendanceMark } from "../api/types";
import { buildLessonOccurrences, occurrenceKey } from "../lib/lessonOccurrences";
import { WeeklyGrid, type WeeklyGridBlock } from "../components/grid/WeeklyGrid";
import { MonthCalendar, type CalendarEvent } from "../components/grid/MonthCalendar";
import { PageHeader } from "../components/ui/PageHeader";
import { EmptyState } from "../components/ui/EmptyState";
import { SkeletonRows } from "../components/ui/Skeleton";
import { Button } from "../components/ui/Button";
import { useToast } from "../context/ToastContext";

export function Calendar() {
  usePageTitle("Calendário");
  const { selectedPeriod, selectedPeriodId, periods, loading: periodsLoading } = usePeriods();
  const { subjects, loading } = useDashboardData(selectedPeriodId !== null ? [selectedPeriodId] : []);
  const { notify } = useToast();
  const [marks, setMarks] = useState<AttendanceMark[]>([]);

  useEffect(() => {
    attendanceMarksApi
      .list()
      .then(setMarks)
      .catch(() => {});
  }, [selectedPeriodId]);

  const handleToggleLesson = async (event: CalendarEvent) => {
    if (event.subjectId === undefined) return;
    const scheduleId = event.scheduleId ?? null;

    try {
      if (event.markId) {
        await attendanceMarksApi.remove(event.markId);
        setMarks((prev) => prev.filter((m) => m.id !== event.markId));
        notify(`Falta desmarcada — ${event.date.split("-").reverse().join("/")}`, "success");
      } else {
        const { mark } = await attendanceMarksApi.create({
          subjectId: event.subjectId,
          date: event.date,
          scheduleId,
        });
        setMarks((prev) => [...prev, mark]);
        notify(`Falta marcada — ${event.date.split("-").reverse().join("/")}`, "success");
      }
    } catch (err) {
      notify(err instanceof ApiError ? err.message : "Erro ao atualizar falta", "error");
    }
  };

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

  const marksByOccurrence = new Map(marks.map((m) => [occurrenceKey(m.subjectId, m.date, m.scheduleId), m]));

  const events: CalendarEvent[] = [
    ...subjects.flatMap((subject) => [
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
    ]),
    ...buildLessonOccurrences(subjects, selectedPeriod).map((occurrence) => {
      const mark = marksByOccurrence.get(occurrenceKey(occurrence.subjectId, occurrence.date, occurrence.scheduleId));
      return {
        date: occurrence.date,
        kind: "lesson" as const,
        title: occurrence.title,
        subjectName: occurrence.subjectName,
        subjectId: occurrence.subjectId,
        scheduleId: occurrence.scheduleId,
        markId: mark?.id ?? null,
      };
    }),
  ];

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
            <p className="calendar-layout__hint">Clique numa aula pra marcar ou desmarcar falta.</p>
            <MonthCalendar events={events} onToggleLesson={handleToggleLesson} />
          </section>
        </div>
      )}
    </div>
  );
}
