import { Link } from "react-router-dom";
import { BookOpen, CalendarClock, ClipboardList, Plus, ArrowRight } from "lucide-react";
import { usePageTitle } from "../context/PageTitleContext";
import { usePeriods } from "../context/PeriodContext";
import { useDashboardData } from "../hooks/useDashboardData";
import { subjectAverage, formatGrade, formatDate, isOverdue, relativeDayLabel } from "../lib/grades";
import { EmptyState } from "../components/ui/EmptyState";
import { SkeletonCards, SkeletonRows } from "../components/ui/Skeleton";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { ErrorBanner } from "../components/ui/ErrorBanner";
import { WeeklyGrid, type WeeklyGridBlock } from "../components/grid/WeeklyGrid";

export function Dashboard() {
  usePageTitle("Dashboard");
  const { selectedPeriod, selectedPeriodId, loading: periodsLoading, periods } = usePeriods();
  const { subjects, upcoming, loading, error } = useDashboardData(selectedPeriodId);

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
          <h3>Matérias de {selectedPeriod?.label ?? "..."}</h3>
          <Link to="/materias" className="link-with-icon">
            Ver todas <ArrowRight size={14} strokeWidth={2} />
          </Link>
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
            {subjects.map((subject) => {
              const average = subjectAverage(subject.assignments, subject.exams);
              return (
                <Link key={subject.id} to={`/materias/${subject.id}`} className="subject-card">
                  <div className="subject-card__header">
                    <span className="subject-card__name">
                      {subject.code && <span className="subject-card__code">{subject.code}</span>}
                      {subject.name}
                    </span>
                    <span className="subject-card__average" data-empty={average === null}>
                      {formatGrade(average)}
                    </span>
                  </div>
                  <div className="subject-card__meta">
                    <span>{subject.schedules.length} horário{subject.schedules.length !== 1 ? "s" : ""}</span>
                    <span aria-hidden="true">·</span>
                    <span>{subject.assignments.length + subject.exams.length} avaliaç{subject.assignments.length + subject.exams.length !== 1 ? "ões" : "ão"}</span>
                  </div>
                </Link>
              );
            })}
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
            {upcoming.map((item) => (
              <li key={`${item.kind}-${item.id}`} className="upcoming-item">
                <span className={`upcoming-item__kind upcoming-item__kind--${item.kind}`}>
                  {item.kind === "exam" ? "Prova" : "Atividade"}
                </span>
                <Link to={`/materias/${item.subjectId}`} className="upcoming-item__title">
                  {item.title}
                </Link>
                <span className="upcoming-item__subject">{item.subjectName}</span>
                <span className="upcoming-item__date">
                  {formatDate(item.date)}
                  {isOverdue(item.date) ? (
                    <Badge tone="warning">atrasada</Badge>
                  ) : (
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
