import { Link } from "react-router-dom";
import { BookOpen, CalendarClock, ClipboardList, Flame, Plus, ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { usePageTitle } from "../context/PageTitleContext";
import { usePeriods } from "../context/PeriodContext";
import { useDashboardData } from "../hooks/useDashboardData";
import { useAnimatedNumber } from "../hooks/useAnimatedNumber";
import { useGamification } from "../hooks/useGamification";
import { subjectAverage, formatGrade, formatDate, isOverdue, relativeDayLabel } from "../lib/grades";
import type { SubjectDetails } from "../api/types";
import type { CSSProperties } from "react";
import { EmptyState } from "../components/ui/EmptyState";
import { SkeletonCards, SkeletonRows } from "../components/ui/Skeleton";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { ErrorBanner } from "../components/ui/ErrorBanner";
import { WeeklyGrid, type WeeklyGridBlock } from "../components/grid/WeeklyGrid";
import { PeriodFilterMenu, describePeriodSelection } from "../components/dashboard/PeriodFilterMenu";

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
  const { selectedPeriodId, loading: periodsLoading, periods } = usePeriods();
  const { streak, xp, level, loading: gamificationLoading } = useGamification();

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

  const { subjects, upcoming, loading, error } = useDashboardData(
    filterPeriodIds ? Array.from(filterPeriodIds) : [],
  );

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

  return (
    <div className="dashboard">
      {error && <ErrorBanner message={error} />}

      {!gamificationLoading && (
        <section className="dashboard__section">
          <div className="dashboard__section-header">
            <h3>Seu progresso</h3>
            <Link to="/perfil" className="link-with-icon">
              Ver conquistas <ArrowRight size={14} strokeWidth={2} />
            </Link>
          </div>
          <div className="progress-row">
            <span className="progress-row__streak" data-active={streak.current > 0}>
              <Flame size={16} strokeWidth={2} />
              {streak.current} {streak.current === 1 ? "dia seguido" : "dias seguidos"}
            </span>
            <div className="progress-row__level">
              <div className="progress-row__level-top">
                <span className="progress-row__level-name">{level.name}</span>
                <span className="progress-row__xp">
                  {xp} XP{level.nextThreshold !== null ? ` · ${level.nextThreshold - xp} para o próximo nível` : ""}
                </span>
              </div>
              <div className="xp-bar">
                <div className="xp-bar__fill" style={{ width: `${level.progressPct}%` }} />
              </div>
            </div>
          </div>
        </section>
      )}

      {!loading && weekBlocks.length > 0 && (
        <section className="dashboard__section">
          <div className="dashboard__section-header">
            <h3>Sua semana</h3>
          </div>
          <WeeklyGrid blocks={weekBlocks} />
        </section>
      )}

      <section className="dashboard__section">
        <div className="dashboard__section-header">
          <h3>
            Matérias de {filterPeriodIds ? describePeriodSelection(periods, filterPeriodIds) : "..."}
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
            <Link to="/materias" className="link-with-icon">
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
              <Link to="/materias">
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
        </div>

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
    </div>
  );
}
