import { useState } from "react";
import { BookOpen, ChevronLeft, ChevronRight, Clock, ListChecks, Plus, Trash2, X } from "lucide-react";
import { usePageTitle } from "../context/PageTitleContext";
import { usePeriods } from "../context/PeriodContext";
import { useEntityList } from "../hooks/useEntityList";
import { subjectsApi, studySessionsApi, dailyNotesApi } from "../api/client";
import { formatDate, todayISO } from "../lib/grades";
import type { DailyNote } from "../api/types";
import { PageHeader } from "../components/ui/PageHeader";
import { EmptyState } from "../components/ui/EmptyState";
import { SkeletonRows } from "../components/ui/Skeleton";
import { Button } from "../components/ui/Button";
import { Field } from "../components/ui/Field";
import { Badge } from "../components/ui/Badge";
import { ConfirmDelete } from "../components/ui/ConfirmDelete";
import { ErrorBanner } from "../components/ui/ErrorBanner";
import { PomodoroTimer } from "../components/studies/PomodoroTimer";

function formatHours(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h${String(m).padStart(2, "0")}`;
}

export function Studies() {
  usePageTitle("Estudos");
  const { selectedPeriod, selectedPeriodId } = usePeriods();

  const { items: subjects, loading: subjectsLoading } = useEntityList(subjectsApi);
  const {
    items: sessions,
    loading: sessionsLoading,
    error: sessionsError,
    create: createSession,
    remove: removeSession,
  } = useEntityList(studySessionsApi);
  const {
    items: notes,
    loading: notesLoading,
    error: notesError,
    create: createNote,
    update: updateNote,
    remove: removeNote,
  } = useEntityList(dailyNotesApi);

  const periodSubjects = subjects.filter((s) => s.periodId === selectedPeriodId);
  const periodSubjectIds = new Set(periodSubjects.map((s) => s.id));
  const subjectName = (id: number) => subjects.find((s) => s.id === id)?.name ?? "—";

  const [manualOpen, setManualOpen] = useState(false);
  const [manualSubjectId, setManualSubjectId] = useState("");
  const [manualTopic, setManualTopic] = useState("");
  const [manualDate, setManualDate] = useState(todayISO());
  const [manualDuration, setManualDuration] = useState("");

  const periodSessions = sessions
    .filter((s) => periodSubjectIds.has(s.subjectId))
    .sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);

  const totalsBySubject = periodSubjects
    .map((s) => ({
      subject: s,
      minutes: periodSessions.filter((sess) => sess.subjectId === s.id).reduce((sum, sess) => sum + sess.durationMinutes, 0),
    }))
    .filter((t) => t.minutes > 0)
    .sort((a, b) => b.minutes - a.minutes);

  const maxMinutes = Math.max(1, ...totalsBySubject.map((t) => t.minutes));
  const totalMinutesAll = periodSessions.reduce((sum, s) => sum + s.durationMinutes, 0);

  const handlePomodoroComplete = ({
    subjectId,
    topic,
    durationMinutes,
  }: {
    subjectId: number;
    topic: string;
    durationMinutes: number;
  }) => {
    createSession(
      { subjectId, topic: topic || null, date: todayISO(), durationMinutes, source: "pomodoro" },
      `Sessão de foco registrada: ${durationMinutes} min`,
    );
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualSubjectId || !manualDate || !manualDuration) return;
    const ok = await createSession(
      { subjectId: Number(manualSubjectId), topic: manualTopic || null, date: manualDate, durationMinutes: Number(manualDuration), source: "manual" },
      "Sessão registrada",
    );
    if (ok) {
      setManualSubjectId("");
      setManualTopic("");
      setManualDate(todayISO());
      setManualDuration("");
      setManualOpen(false);
    }
  };

  const [viewDate, setViewDate] = useState(todayISO());
  const [noteText, setNoteText] = useState("");

  const dayNotes = notes.filter((n) => n.date === viewDate).sort((a, b) => a.id - b.id);

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteText.trim()) return;
    const ok = await createNote({ date: viewDate, content: noteText.trim(), done: false }, "Anotação adicionada");
    if (ok) setNoteText("");
  };

  const toggleNoteDone = (note: DailyNote) =>
    updateNote(
      note.id,
      { date: note.date, content: note.content, done: !note.done },
      note.done ? "Marcada como pendente" : "Concluída",
    );

  const shiftDate = (deltaDays: number) => {
    const d = new Date(`${viewDate}T00:00:00`);
    d.setDate(d.getDate() + deltaDays);
    setViewDate(d.toISOString().slice(0, 10));
  };

  const viewDateLabel = viewDate === todayISO() ? "Hoje" : formatDate(viewDate);

  return (
    <div>
      <PageHeader title="Estudos" description="Pomodoro, horas de estudo por matéria e anotações do dia." />

      <section className="hub-section">
        <div className="hub-section__header">
          <h3>Pomodoro</h3>
        </div>
        {subjectsLoading ? (
          <SkeletonRows rows={3} />
        ) : periodSubjects.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="Cadastre uma matéria para usar o Pomodoro"
            description="As sessões de foco são registradas vinculadas a uma matéria do período atual."
          />
        ) : (
          <PomodoroTimer subjects={periodSubjects} onSessionComplete={handlePomodoroComplete} />
        )}
      </section>

      <section className="hub-section">
        <div className="hub-section__header">
          <h3>Horas de estudo de {selectedPeriod?.label ?? "..."}</h3>
          {periodSubjects.length > 0 && (
            <Button variant="ghost" icon={manualOpen ? X : Plus} onClick={() => setManualOpen((v) => !v)}>
              {manualOpen ? "Cancelar" : "Registrar sessão"}
            </Button>
          )}
        </div>

        {sessionsError && <ErrorBanner message={sessionsError} />}

        {manualOpen && (
          <form className="inline-form" onSubmit={handleManualSubmit}>
            <label className="field">
              <span className="field__label">Matéria</span>
              <select className="field__input" value={manualSubjectId} onChange={(e) => setManualSubjectId(e.target.value)} required>
                <option value="" disabled>
                  Selecione
                </option>
                {periodSubjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <Field label="Assunto (opcional)" value={manualTopic} onChange={(e) => setManualTopic(e.target.value)} />
            <Field label="Data" type="date" value={manualDate} onChange={(e) => setManualDate(e.target.value)} required />
            <Field label="Duração (min)" type="number" min="1" value={manualDuration} onChange={(e) => setManualDuration(e.target.value)} required />
            <Button type="submit" variant="primary">
              Salvar
            </Button>
          </form>
        )}

        {sessionsLoading || subjectsLoading ? (
          <SkeletonRows rows={3} />
        ) : periodSessions.length === 0 ? (
          <EmptyState
            icon={Clock}
            title="Nenhuma sessão de estudo registrada ainda"
            description="Use o Pomodoro acima ou registre uma sessão manualmente."
          />
        ) : (
          <>
            <div className="study-totals">
              <p className="study-totals__summary">
                Total no período: <strong>{formatHours(totalMinutesAll)}</strong>
              </p>
              {totalsBySubject.map(({ subject, minutes }) => (
                <div key={subject.id} className="study-totals__row">
                  <span className="study-totals__label">{subject.name}</span>
                  <div className="study-totals__bar">
                    <div className="study-totals__bar-fill" style={{ width: `${(minutes / maxMinutes) * 100}%` }} />
                  </div>
                  <span className="study-totals__value">{formatHours(minutes)}</span>
                </div>
              ))}
              <p className="field__hint">Gráficos mais completos chegam em breve por aqui.</p>
            </div>

            <table className="eval-table">
              <thead>
                <tr>
                  <th>Matéria</th>
                  <th>Assunto</th>
                  <th>Data</th>
                  <th>Duração</th>
                  <th>Origem</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {periodSessions.slice(0, 20).map((session) => (
                  <tr key={session.id}>
                    <td>{subjectName(session.subjectId)}</td>
                    <td>{session.topic || "—"}</td>
                    <td>{formatDate(session.date)}</td>
                    <td className="eval-table__num">{formatHours(session.durationMinutes)}</td>
                    <td>
                      <Badge tone={session.source === "pomodoro" ? "accent" : "neutral"}>
                        {session.source === "pomodoro" ? "Pomodoro" : "Manual"}
                      </Badge>
                    </td>
                    <td>
                      <ConfirmDelete onConfirm={() => removeSession(session.id, "Sessão removida")} label="Remover sessão" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </section>

      <section className="hub-section">
        <div className="hub-section__header">
          <h3>Anotações do dia</h3>
          <div className="daily-notes__nav">
            <button type="button" className="icon-btn" onClick={() => shiftDate(-1)} aria-label="Dia anterior">
              <ChevronLeft size={16} strokeWidth={2} />
            </button>
            <span className="daily-notes__date">{viewDateLabel}</span>
            <button type="button" className="icon-btn" onClick={() => shiftDate(1)} aria-label="Próximo dia">
              <ChevronRight size={16} strokeWidth={2} />
            </button>
          </div>
        </div>

        {notesError && <ErrorBanner message={notesError} />}

        <form className="daily-notes__form" onSubmit={handleAddNote}>
          <input
            className="field__input"
            placeholder="O que você precisa estudar hoje?"
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
          />
          <Button type="submit" variant="primary" icon={Plus}>
            Adicionar
          </Button>
        </form>

        {notesLoading ? (
          <SkeletonRows rows={2} />
        ) : dayNotes.length === 0 ? (
          <EmptyState icon={ListChecks} title="Nenhuma anotação para este dia" />
        ) : (
          <ul className="daily-notes__list">
            {dayNotes.map((note) => (
              <li key={note.id} className="daily-notes__item" data-done={note.done}>
                <button
                  type="button"
                  className="daily-notes__checkbox"
                  aria-label={note.done ? "Marcar como pendente" : "Marcar como concluída"}
                  onClick={() => toggleNoteDone(note)}
                />
                <span className="daily-notes__content">{note.content}</span>
                <button
                  type="button"
                  className="icon-btn icon-btn--danger"
                  aria-label="Remover anotação"
                  onClick={() => removeNote(note.id, "Anotação removida")}
                >
                  <Trash2 size={15} strokeWidth={2} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
