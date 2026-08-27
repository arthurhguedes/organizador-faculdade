import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarClock } from "lucide-react";
import { usePageTitle } from "../context/PageTitleContext";
import { usePeriods } from "../context/PeriodContext";
import { useDashboardData } from "../hooks/useDashboardData";
import { attendanceMarksApi, assignmentsApi, examsApi, ApiError } from "../api/client";
import type { AttendanceMark } from "../api/types";
import { buildLessonOccurrences, occurrenceKey } from "../lib/lessonOccurrences";
import { assignSeriesColors } from "../lib/chartColors";
import { WeeklyGrid, type WeeklyGridBlock } from "../components/grid/WeeklyGrid";
import { MonthCalendar, type CalendarEvent } from "../components/grid/MonthCalendar";
import { DayDetailPanel } from "../components/grid/DayDetailPanel";
import { PageHeader } from "../components/ui/PageHeader";
import { EmptyState } from "../components/ui/EmptyState";
import { SkeletonRows } from "../components/ui/Skeleton";
import { Button } from "../components/ui/Button";
import { useToast } from "../context/ToastContext";

export function Calendar() {
  usePageTitle("Calendário");
  const { selectedPeriod, selectedPeriodId, periods, loading: periodsLoading } = usePeriods();
  const { subjects, loading, patchSubject } = useDashboardData(selectedPeriodId !== null ? [selectedPeriodId] : []);
  const { notify } = useToast();
  const [marks, setMarks] = useState<AttendanceMark[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [pendingOccurrences, setPendingOccurrences] = useState<Set<string>>(new Set());

  useEffect(() => {
    attendanceMarksApi
      .list()
      .then(setMarks)
      .catch(() => {});
  }, [selectedPeriodId]);

  const occurrenceKeyOf = (event: CalendarEvent) =>
    occurrenceKey(event.subjectId!, event.date, event.scheduleId ?? null);

  const setOccurrencePending = (key: string, pending: boolean) => {
    setPendingOccurrences((prev) => {
      const next = new Set(prev);
      if (pending) next.add(key);
      else next.delete(key);
      return next;
    });
  };

  const handleEventDrop = async (event: CalendarEvent, newDate: string) => {
    if (event.id === undefined || event.subjectId === undefined || newDate === event.date) return;
    if (event.kind !== "exam" && event.kind !== "assignment") return;
    const formattedDate = newDate.split("-").reverse().join("/");
    const { id, subjectId, kind } = event;
    const previousDate = event.date;

    // Otimista: move o evento na hora, sem esperar a rede — só desfaz se falhar.
    patchSubject(subjectId, (prev) => ({
      ...prev,
      assignments: kind === "assignment" ? prev.assignments.map((a) => (a.id === id ? { ...a, dueDate: newDate } : a)) : prev.assignments,
      exams: kind === "exam" ? prev.exams.map((e) => (e.id === id ? { ...e, date: newDate } : e)) : prev.exams,
    }));

    try {
      if (kind === "exam") {
        await examsApi.update(id, {
          subjectId,
          title: event.title,
          date: newDate,
          weight: event.weight ?? 0,
          grade: event.grade ?? null,
        });
      } else {
        await assignmentsApi.update(id, {
          subjectId,
          title: event.title,
          dueDate: newDate,
          weight: event.weight ?? 0,
          grade: event.grade ?? null,
        });
      }
      notify(`Data movida para ${formattedDate}`, "success");
    } catch (err) {
      patchSubject(subjectId, (prev) => ({
        ...prev,
        assignments: kind === "assignment" ? prev.assignments.map((a) => (a.id === id ? { ...a, dueDate: previousDate } : a)) : prev.assignments,
        exams: kind === "exam" ? prev.exams.map((e) => (e.id === id ? { ...e, date: previousDate } : e)) : prev.exams,
      }));
      notify(err instanceof ApiError ? err.message : "Erro ao mover a data", "error");
    }
  };

  const handleToggleLesson = async (event: CalendarEvent) => {
    if (event.subjectId === undefined) return;
    const scheduleId = event.scheduleId ?? null;
    const key = occurrenceKeyOf(event);
    if (pendingOccurrences.has(key)) return;
    const previousMarks = marks;
    const previousMarkId = event.markId;
    const tempId = -Date.now() - Math.random();

    // Atualização otimista: reflete a mudança na hora, antes da resposta do servidor.
    setMarks((prev) =>
      previousMarkId
        ? prev.filter((m) => m.id !== previousMarkId)
        : [...prev, { id: tempId, subjectId: event.subjectId!, scheduleId, date: event.date, kind: "falta" }],
    );
    setOccurrencePending(key, true);

    try {
      if (previousMarkId) {
        await attendanceMarksApi.remove(previousMarkId);
        notify(`Marcação removida — ${event.date.split("-").reverse().join("/")}`, "success");
      } else {
        const { mark } = await attendanceMarksApi.create({
          subjectId: event.subjectId,
          date: event.date,
          scheduleId,
        });
        // Troca só a entrada otimista desta chamada (por tempId), nunca "qualquer id negativo" —
        // com duas marcações em voo ao mesmo tempo isso sobrescrevia a otimista da outra.
        setMarks((prev) => prev.map((m) => (m.id === tempId ? mark : m)));
        notify(`Falta marcada — ${event.date.split("-").reverse().join("/")}`, "success");
      }
    } catch (err) {
      setMarks(previousMarks);
      notify(err instanceof ApiError ? err.message : "Erro ao atualizar falta", "error");
    } finally {
      setOccurrencePending(key, false);
    }
  };

  const handleSetLessonState = async (event: CalendarEvent, state: "presente" | "falta" | "sem_aula") => {
    if (event.subjectId === undefined) return;
    const scheduleId = event.scheduleId ?? null;
    const targetKind = state === "presente" ? null : state;
    if ((event.markKind ?? null) === targetKind) return;
    const key = occurrenceKeyOf(event);
    if (pendingOccurrences.has(key)) return;
    const previousMarks = marks;
    const previousMarkId = event.markId;
    const tempId = -Date.now() - Math.random();

    // Atualização otimista: troca o estado do botão na hora, sem esperar a rede.
    setMarks((prev) => {
      const withoutPrevious = previousMarkId ? prev.filter((m) => m.id !== previousMarkId) : prev;
      return targetKind
        ? [...withoutPrevious, { id: tempId, subjectId: event.subjectId!, scheduleId, date: event.date, kind: targetKind }]
        : withoutPrevious;
    });
    setOccurrencePending(key, true);

    try {
      // Remove a marcação antiga e cria a nova em paralelo (são operações independentes
      // no backend) em vez de sequencialmente, pra não pagar duas viagens de rede seguidas.
      const [, created] = await Promise.all([
        previousMarkId ? attendanceMarksApi.remove(previousMarkId) : Promise.resolve(null),
        targetKind
          ? attendanceMarksApi.create({ subjectId: event.subjectId, date: event.date, scheduleId, kind: targetKind })
          : Promise.resolve(null),
      ]);
      if (created) {
        // Troca só a entrada otimista desta chamada (por tempId) — ver handleToggleLesson.
        setMarks((prev) => prev.map((m) => (m.id === tempId ? created.mark : m)));
      }
      const label = targetKind === "falta" ? "Falta marcada" : targetKind === "sem_aula" ? "Sem aula marcada" : "Marcação removida";
      notify(`${label} — ${event.date.split("-").reverse().join("/")}`, "success");
    } catch (err) {
      setMarks(previousMarks);
      notify(err instanceof ApiError ? err.message : "Erro ao atualizar", "error");
    } finally {
      setOccurrencePending(key, false);
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
      sublabel: slot.room ?? undefined,
      weekday: slot.weekday,
      startTime: slot.startTime,
      endTime: slot.endTime,
      tone: "accent" as const,
    })),
  );

  const marksByOccurrence = new Map(marks.map((m) => [occurrenceKey(m.subjectId, m.date, m.scheduleId), m]));
  const subjectColors = assignSeriesColors(subjects.map((s) => s.id));

  const events: CalendarEvent[] = [
    ...subjects.flatMap((subject) => [
      ...subject.assignments.map((a) => ({
        date: a.dueDate,
        kind: "assignment" as const,
        title: a.title,
        subjectName: subject.name,
        subjectId: subject.id,
        id: a.id,
        weight: a.weight,
        grade: a.grade,
      })),
      ...subject.exams.map((e) => ({
        date: e.date,
        kind: "exam" as const,
        title: e.title,
        subjectName: subject.name,
        subjectId: subject.id,
        id: e.id,
        weight: e.weight,
        grade: e.grade,
      })),
    ]),
    ...buildLessonOccurrences(subjects, selectedPeriod).map((occurrence) => {
      const mark = marksByOccurrence.get(occurrenceKey(occurrence.subjectId, occurrence.date, occurrence.scheduleId));
      const schedule =
        occurrence.scheduleId !== null
          ? subjects.find((s) => s.id === occurrence.subjectId)?.schedules.find((sc) => sc.id === occurrence.scheduleId)
          : undefined;
      return {
        date: occurrence.date,
        kind: "lesson" as const,
        title: occurrence.title,
        subjectName: occurrence.subjectName,
        subjectId: occurrence.subjectId,
        scheduleId: occurrence.scheduleId,
        markId: mark?.id ?? null,
        markKind: mark?.kind ?? null,
        startTime: schedule?.startTime,
        endTime: schedule?.endTime,
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
            <p className="calendar-layout__hint">
              Clique numa aula pra marcar ou desmarcar falta. Arraste uma prova ou atividade pra outro dia pra mudar a data.
            </p>
            <MonthCalendar
              events={events}
              onToggleLesson={handleToggleLesson}
              onEventDrop={handleEventDrop}
              subjectColors={subjectColors}
              selectedDate={selectedDate}
              onSelectDate={(date) => setSelectedDate((prev) => (prev === date ? null : date))}
              isLessonPending={(event) => pendingOccurrences.has(occurrenceKeyOf(event))}
            />
            {selectedDate && (
              <DayDetailPanel
                date={selectedDate}
                lessons={events.filter((e) => e.date === selectedDate && e.kind === "lesson")}
                otherEvents={events.filter((e) => e.date === selectedDate && e.kind !== "lesson")}
                subjectColors={subjectColors}
                onSetLessonState={handleSetLessonState}
                isPending={(event) => pendingOccurrences.has(occurrenceKeyOf(event))}
                onClose={() => setSelectedDate(null)}
              />
            )}
          </section>
        </div>
      )}
    </div>
  );
}
