import { useEffect, useState } from "react";
import { Clock, Plus, X } from "lucide-react";
import { usePageTitle } from "../context/PageTitleContext";
import { usePeriods } from "../context/PeriodContext";
import { usePomodoro } from "../context/PomodoroContext";
import { useEntityList } from "../hooks/useEntityList";
import { subjectsApi, studySessionsApi } from "../api/client";
import { formatDate, formatHours, todayISO } from "../lib/grades";
import { assignSeriesColors } from "../lib/chartColors";
import { DailyTrendChart } from "../components/studies/StudyCharts";
import type { StudySession } from "../api/types";
import { PageHeader } from "../components/ui/PageHeader";
import { EmptyState } from "../components/ui/EmptyState";
import { SkeletonRows } from "../components/ui/Skeleton";
import { Button } from "../components/ui/Button";
import { Field } from "../components/ui/Field";
import { Badge } from "../components/ui/Badge";
import { ConfirmDelete } from "../components/ui/ConfirmDelete";
import { ErrorBanner } from "../components/ui/ErrorBanner";
import { PomodoroTimer } from "../components/studies/PomodoroTimer";

export function Studies() {
  usePageTitle("Estudos");
  const { selectedPeriod, selectedPeriodId } = usePeriods();

  const { lastSessionCreatedAt } = usePomodoro();

  const { items: subjects, loading: subjectsLoading } = useEntityList(subjectsApi);
  const {
    items: sessions,
    loading: sessionsLoading,
    error: sessionsError,
    create: createSession,
    update: updateSession,
    remove: removeSession,
    reload: reloadSessions,
  } = useEntityList(studySessionsApi);
  const periodSubjects = subjects.filter((s) => s.periodId === selectedPeriodId);
  const periodSubjectIds = new Set(periodSubjects.map((s) => s.id));
  const subjectName = (id: number) => subjects.find((s) => s.id === id)?.name ?? "—";

  const [manualOpen, setManualOpen] = useState(false);
  const [manualSubjectId, setManualSubjectId] = useState("");
  const [manualTopic, setManualTopic] = useState("");
  const [manualDate, setManualDate] = useState(todayISO());
  const [manualDuration, setManualDuration] = useState("");
  const [manualSubmitting, setManualSubmitting] = useState(false);

  const isInSelectedPeriod = (session: StudySession) =>
    session.subjectId !== null
      ? periodSubjectIds.has(session.subjectId)
      : Boolean(selectedPeriod && session.date >= selectedPeriod.startDate && session.date <= selectedPeriod.endDate);

  const periodSessions = sessions
    .filter(isInSelectedPeriod)
    .sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);

  const UNLINKED_ID = -1;

  const totalsBySubject = periodSubjects
    .map((s) => ({
      id: s.id,
      label: s.name,
      minutes: periodSessions.filter((sess) => sess.subjectId === s.id).reduce((sum, sess) => sum + sess.durationMinutes, 0),
    }))
    .filter((t) => t.minutes > 0);

  const unlinkedMinutes = periodSessions.filter((s) => s.subjectId === null).reduce((sum, s) => sum + s.durationMinutes, 0);
  if (unlinkedMinutes > 0) {
    totalsBySubject.push({ id: UNLINKED_ID, label: "Sem matéria vinculada", minutes: unlinkedMinutes });
  }
  totalsBySubject.sort((a, b) => b.minutes - a.minutes);

  const seriesColors = assignSeriesColors(totalsBySubject.map((t) => t.id));
  const maxMinutes = Math.max(1, ...totalsBySubject.map((t) => t.minutes));
  const totalMinutesAll = periodSessions.reduce((sum, s) => sum + s.durationMinutes, 0);

  const [linkingSessionId, setLinkingSessionId] = useState<number | null>(null);

  // O Pomodoro vive no PomodoroContext (persiste entre navegações), então
  // pode criar uma study_session com esta página desmontada — recarrega a
  // lista quando isso acontece pra refletir sem precisar de F5.
  useEffect(() => {
    if (lastSessionCreatedAt !== null) reloadSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastSessionCreatedAt]);

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualDate || !manualDuration || manualSubmitting) return;
    setManualSubmitting(true);
    try {
      const ok = await createSession(
        {
          subjectId: manualSubjectId ? Number(manualSubjectId) : null,
          topic: manualTopic || null,
          date: manualDate,
          durationMinutes: Number(manualDuration),
          source: "manual",
        },
        "Sessão registrada",
      );
      if (ok) {
        setManualSubjectId("");
        setManualTopic("");
        setManualDate(todayISO());
        setManualDuration("");
        setManualOpen(false);
      }
    } finally {
      setManualSubmitting(false);
    }
  };

  const linkSubjectToSession = (session: StudySession, subjectId: number) => {
    updateSession(
      session.id,
      { subjectId, topic: session.topic, date: session.date, durationMinutes: session.durationMinutes, source: session.source },
      "Matéria vinculada",
    );
    setLinkingSessionId(null);
  };

  return (
    <div>
      <PageHeader title="Estudos" description="Pomodoro e horas de estudo por matéria." />

      <section className="hub-section">
        <div className="hub-section__header">
          <h3>Pomodoro</h3>
        </div>
        <PomodoroTimer />
      </section>

      <section className="hub-section">
        <div className="hub-section__header">
          <h3>Horas de estudo de {selectedPeriod?.label ?? "..."}</h3>
          <Button variant="ghost" icon={manualOpen ? X : Plus} onClick={() => setManualOpen((v) => !v)}>
            {manualOpen ? "Cancelar" : "Registrar sessão"}
          </Button>
        </div>

        {sessionsError && <ErrorBanner message={sessionsError} />}

        {manualOpen && (
          <form className="inline-form" onSubmit={handleManualSubmit}>
            <label className="field">
              <span className="field__label">Matéria (opcional)</span>
              <select className="field__input" value={manualSubjectId} onChange={(e) => setManualSubjectId(e.target.value)}>
                <option value="">Sem matéria</option>
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
            <Button type="submit" variant="primary" loading={manualSubmitting}>
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
            <DailyTrendChart sessions={periodSessions} />

            <div className="study-totals">
              <p className="study-totals__summary">
                Total no período: <strong>{formatHours(totalMinutesAll)}</strong>
              </p>
              {totalsBySubject.map(({ id, label, minutes }) => (
                <div key={id} className="study-totals__row">
                  <span className="study-totals__label">{label}</span>
                  <div className="study-totals__bar">
                    <div
                      className="study-totals__bar-fill"
                      style={{ width: `${(minutes / maxMinutes) * 100}%`, background: seriesColors.get(id) }}
                    />
                  </div>
                  <span className="study-totals__value">{formatHours(minutes)}</span>
                </div>
              ))}
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
                    <td>
                      {session.subjectId !== null ? (
                        subjectName(session.subjectId)
                      ) : linkingSessionId === session.id ? (
                        <select
                          autoFocus
                          className="field__input link-subject-select"
                          defaultValue=""
                          onBlur={() => setLinkingSessionId(null)}
                          onChange={(e) => e.target.value && linkSubjectToSession(session, Number(e.target.value))}
                        >
                          <option value="" disabled>
                            Selecione
                          </option>
                          {periodSubjects.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <button type="button" className="link-subject-btn" onClick={() => setLinkingSessionId(session.id)}>
                          Sem matéria · vincular
                        </button>
                      )}
                    </td>
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
    </div>
  );
}
