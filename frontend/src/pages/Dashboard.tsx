import { Link } from "react-router-dom";
import { BookOpen, CalendarClock, ClipboardList, Plus, ArrowRight, StickyNote, X } from "lucide-react";
import { useEffect, useState } from "react";
import { usePageTitle } from "../context/PageTitleContext";
import { usePeriods } from "../context/PeriodContext";
import { useAuth } from "../context/AuthContext";
import { useDashboardData } from "../hooks/useDashboardData";
import { useAnimatedNumber } from "../hooks/useAnimatedNumber";
import { useAcademicStats } from "../hooks/useAcademicStats";
import { useEntityList } from "../hooks/useEntityList";
import { useToast } from "../context/ToastContext";
import { subjectAverage, formatGrade, formatHours, formatDate, isOverdue, relativeDayLabel, todayISO } from "../lib/grades";
import { assignmentsApi, examsApi, dailyNotesApi, ApiError } from "../api/client";
import type { SubjectDetails } from "../api/types";
import type { CSSProperties } from "react";
import { EmptyState } from "../components/ui/EmptyState";
import { SkeletonCards, SkeletonRows } from "../components/ui/Skeleton";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Field } from "../components/ui/Field";
import { ErrorBanner } from "../components/ui/ErrorBanner";
import { PeriodFilterMenu, describePeriodSelection } from "../components/dashboard/PeriodFilterMenu";

type QuickAddKind = "assignment" | "exam";

function greetingForHour(hour: number) {
  if (hour < 6) return "Boa noite";
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

function DashboardSubjectCard({ subject, index }: { subject: SubjectDetails; index: number }) {
  const average = subjectAverage(subject.assignments, subject.exams);
  const displayedAverage = useAnimatedNumber(average);

  return (
    <Link
      to={`/materias/${subject.id}`}
      className="subject-card stagger-in"
      style={{ "--i": index } as CSSProperties}
    >
      <div className="subject-card__header">
        <span className="subject-card__name">
          {subject.code && <span className="subject-card__code">{subject.code}</span>}
          {subject.name}
        </span>
        <span className="subject-card__average" data-empty={average === null}>
          {formatGrade(displayedAverage)}
        </span>
      </div>
      <div className="subject-card__meta">
        <span>{subject.schedules.length} horário{subject.schedules.length !== 1 ? "s" : ""}</span>
        <span aria-hidden="true">·</span>
        <span>{subject.assignments.length + subject.exams.length} avaliaç{subject.assignments.length + subject.exams.length !== 1 ? "ões" : "ão"}</span>
      </div>
    </Link>
  );
}

export function Dashboard() {
  usePageTitle("Dashboard");
  const { user } = useAuth();
  const firstName = user?.name.split(" ")[0];
  const { selectedPeriodId, selectedPeriod, loading: periodsLoading, periods } = usePeriods();
  const { loading: academicStatsLoading, courseAverage, currentPeriodAverage, coefficient, totalStudyMinutes } =
    useAcademicStats(selectedPeriodId);

  const [filterPeriodIds, setFilterPeriodIds] = useState<Set<number> | null>(null);

  useEffect(() => {
    if (filterPeriodIds !== null || periodsLoading || periods.length === 0) return;
    setFilterPeriodIds(new Set([selectedPeriodId ?? periods[0].id]));
  }, [filterPeriodIds, periodsLoading, periods, selectedPeriodId]);

  function toggleFilterPeriod(id: number) {
    setFilterPeriodIds((prev) => {
      if (!prev) return prev;
      const next = new Set(prev);
      if (next.has(id)) {
        if (next.size === 1) return prev;
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function toggleAllFilterPeriods() {
    setFilterPeriodIds((prev) => {
      if (!prev) return prev;
      if (prev.size === periods.length) {
        const [first] = prev;
        return new Set([first]);
      }
      return new Set(periods.map((p) => p.id));
    });
  }

  const { subjects, upcoming, loading, error, patchSubject } = useDashboardData(
    filterPeriodIds ? Array.from(filterPeriodIds) : [],
  );
  const { notify } = useToast();

  const { items: notes, loading: notesLoading, update: updateNote } = useEntityList(dailyNotesApi);
  const todayNotes = notes.filter((n) => n.date === todayISO()).sort((a, b) => a.id - b.id);
  const toggleNoteDone = (note: (typeof notes)[number]) =>
    updateNote(
      note.id,
      { date: note.date, content: note.content, done: !note.done },
      note.done ? "Marcada como pendente" : "Concluída",
    );

  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickAddKind, setQuickAddKind] = useState<QuickAddKind>("assignment");
  const [quickAddSubjectId, setQuickAddSubjectId] = useState("");
  const [quickAddTitle, setQuickAddTitle] = useState("");
  const [quickAddDate, setQuickAddDate] = useState("");
  const [quickAddWeight, setQuickAddWeight] = useState("");
  const [quickAddSaving, setQuickAddSaving] = useState(false);

  const handleQuickAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickAddSubjectId || !quickAddTitle || !quickAddDate || !quickAddWeight) return;
    setQuickAddSaving(true);
    try {
      const subjectId = Number(quickAddSubjectId);
      if (quickAddKind === "assignment") {
        const [created] = await assignmentsApi.create({ subjectId, title: quickAddTitle, dueDate: quickAddDate, weight: Number(quickAddWeight), grade: null });
        patchSubject(subjectId, (prev) => ({ ...prev, assignments: [...prev.assignments, created] }));
        notify("Atividade adicionada", "success");
      } else {
        const [created] = await examsApi.create({ subjectId, title: quickAddTitle, date: quickAddDate, weight: Number(quickAddWeight), grade: null });
        patchSubject(subjectId, (prev) => ({ ...prev, exams: [...prev.exams, created] }));
        notify("Prova adicionada", "success");
      }
      setQuickAddTitle("");
      setQuickAddDate("");
      setQuickAddWeight("");
      setQuickAddSubjectId("");
      setQuickAddOpen(false);
    } catch (err) {
      notify(err instanceof ApiError ? err.message : "Erro ao adicionar", "error");
    } finally {
      setQuickAddSaving(false);
    }
  };

  if (!periodsLoading && periods.length === 0) {
    return (
      <EmptyState
        icon={CalendarClock}
        title="Nenhum período cadastrado ainda"
        description="Crie um período letivo (ex: 2026/1) para começar a organizar suas matérias."
        action={
          <Link to="/periodos">
            <Button variant="primary" icon={Plus}>
              Criar período
            </Button>
          </Link>
        }
      />
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard__greeting">
        <h1>
          {greetingForHour(new Date().getHours())}{firstName ? `, ${firstName}` : ""}
        </h1>
        <p>Como podemos ajudar hoje?</p>
      </div>

      {error && <ErrorBanner message={error} />}

      <section className="dashboard__section">
        <div className="dashboard__section-header">
          <h3>Seu desempenho</h3>
        </div>
        {academicStatsLoading ? (
          <SkeletonCards cards={4} />
        ) : (
          <div className="stat-grid">
            <div className="stat-card">
              <span className="stat-card__label">Média geral do curso</span>
              <span className="stat-card__value" data-empty={courseAverage === null}>
                {formatGrade(courseAverage)}
              </span>
              <span className="stat-card__hint">Todos os períodos</span>
            </div>
            <div className="stat-card">
              <span className="stat-card__label">Média do período atual</span>
              <span className="stat-card__value" data-empty={currentPeriodAverage === null}>
                {formatGrade(currentPeriodAverage)}
              </span>
              <span className="stat-card__hint">{selectedPeriod?.label ?? "—"}</span>
            </div>
            <div className="stat-card">
              <span className="stat-card__label">Horas de estudo</span>
              <span className="stat-card__value">{formatHours(totalStudyMinutes)}</span>
              <span className="stat-card__hint">Total acumulado</span>
            </div>
            <div className="stat-card">
              <span className="stat-card__label">Coeficiente</span>
              <span className="stat-card__value" data-empty={coefficient === null}>
                {formatGrade(coefficient)}
              </span>
              <span className="stat-card__hint">Ponderado por carga horária</span>
            </div>
          </div>
        )}
      </section>

      <section className="dashboard__section">
        <div className="dashboard__section-header">
          <h3>
            {filterPeriodIds ? `Matérias de ${describePeriodSelection(periods, filterPeriodIds)}` : "Matérias"}
          </h3>
          <div className="dashboard__section-actions">
            {filterPeriodIds && (
              <PeriodFilterMenu
                periods={periods}
                selectedIds={filterPeriodIds}
                onToggle={toggleFilterPeriod}
                onToggleAll={toggleAllFilterPeriods}
              />
            )}
            <Link to="/periodos?tab=materias" className="link-with-icon">
              Ver todas <ArrowRight size={14} strokeWidth={2} />
            </Link>
          </div>
        </div>

        {loading ? (
          <SkeletonCards cards={3} />
        ) : subjects.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="Nenhuma matéria cadastrada neste período ainda"
            description="Adicione suas matérias para acompanhar horários, atividades e provas."
            action={
              <Link to="/periodos?tab=materias">
                <Button variant="primary" icon={Plus}>
                  Adicionar matéria
                </Button>
              </Link>
            }
          />
        ) : (
          <div className="subject-grid">
            {subjects.map((subject, index) => (
              <DashboardSubjectCard subject={subject} index={index} key={subject.id} />
            ))}
          </div>
        )}
      </section>

      <section className="dashboard__section">
        <div className="dashboard__section-header">
          <h3>Próximas atividades e provas</h3>
          {subjects.length > 0 && (
            <Button variant="ghost" icon={quickAddOpen ? X : Plus} onClick={() => setQuickAddOpen((v) => !v)}>
              {quickAddOpen ? "Cancelar" : "Nova"}
            </Button>
          )}
        </div>

        {quickAddOpen && (
          <form className="inline-form" onSubmit={handleQuickAddSubmit}>
            <label className="field">
              <span className="field__label">Tipo</span>
              <select className="field__input" value={quickAddKind} onChange={(e) => setQuickAddKind(e.target.value as QuickAddKind)}>
                <option value="assignment">Atividade</option>
                <option value="exam">Prova</option>
              </select>
            </label>
            <label className="field">
              <span className="field__label">Matéria</span>
              <select className="field__input" value={quickAddSubjectId} onChange={(e) => setQuickAddSubjectId(e.target.value)} required>
                <option value="" disabled>
                  Selecione
                </option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <Field label="Título" value={quickAddTitle} onChange={(e) => setQuickAddTitle(e.target.value)} required />
            <Field
              label={quickAddKind === "assignment" ? "Entrega" : "Data"}
              type="date"
              value={quickAddDate}
              onChange={(e) => setQuickAddDate(e.target.value)}
              required
            />
            <Field label="Peso" type="number" step="any" min="0" value={quickAddWeight} onChange={(e) => setQuickAddWeight(e.target.value)} required />
            <Button type="submit" variant="primary" loading={quickAddSaving}>
              Salvar
            </Button>
          </form>
        )}

        {loading ? (
          <SkeletonRows rows={4} />
        ) : upcoming.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="Nenhuma prova ou atividade cadastrada ainda"
            description="Elas aparecem aqui assim que você adicionar em uma matéria."
          />
        ) : (
          <ul className="upcoming-list">
            {upcoming.map((item, index) => (
              <li
                key={`${item.kind}-${item.id}`}
                className="upcoming-item stagger-in"
                style={{ "--i": index } as CSSProperties}
              >
                <span className={`upcoming-item__kind upcoming-item__kind--${item.kind}`}>
                  {item.kind === "exam" ? "Prova" : "Atividade"}
                </span>
                <Link to={`/materias/${item.subjectId}`} className="upcoming-item__title">
                  {item.title}
                </Link>
                <span className="upcoming-item__subject">{item.subjectName}</span>
                <span className="upcoming-item__date">
                  {formatDate(item.date)}
                  {item.grade === null && isOverdue(item.date) ? (
                    <Badge tone="warning">atrasada</Badge>
                  ) : (
                    item.grade === null &&
                    relativeDayLabel(item.date) && <Badge tone="accent">{relativeDayLabel(item.date)}</Badge>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="dashboard__section">
        <div className="dashboard__section-header">
          <h3>Anotações de hoje</h3>
          <Link to="/estudos?tab=anotacoes" className="link-with-icon">
            Ver todas <ArrowRight size={14} strokeWidth={2} />
          </Link>
        </div>

        {notesLoading ? (
          <SkeletonRows rows={2} />
        ) : todayNotes.length === 0 ? (
          <EmptyState
            icon={StickyNote}
            title="Nenhuma anotação para hoje"
            description="Adicione o que você precisa estudar hoje na aba Anotações."
            action={
              <Link to="/estudos?tab=anotacoes">
                <Button variant="primary" icon={Plus}>
                  Adicionar anotação
                </Button>
              </Link>
            }
          />
        ) : (
          <ul className="daily-notes__list">
            {todayNotes.map((note) => (
              <li key={note.id} className="daily-notes__item" data-done={note.done}>
                <button
                  type="button"
                  className="daily-notes__checkbox"
                  aria-label={note.done ? "Marcar como pendente" : "Marcar como concluída"}
                  onClick={() => toggleNoteDone(note)}
                />
                <span className="daily-notes__content">{note.content}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
