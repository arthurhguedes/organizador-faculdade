import { Link } from "react-router-dom";
import { MapPin } from "lucide-react";
import { usePageTitle } from "../context/PageTitleContext";
import { usePeriods } from "../context/PeriodContext";
import { useDashboardData } from "../hooks/useDashboardData";
import { WeeklyGrid, type WeeklyGridBlock } from "../components/grid/WeeklyGrid";
import { PageHeader } from "../components/ui/PageHeader";
import { EmptyState } from "../components/ui/EmptyState";
import { SkeletonRows } from "../components/ui/Skeleton";

export function Mapa() {
  usePageTitle("Mapa");
  const { selectedPeriod, selectedPeriodId } = usePeriods();
  const { subjects, loading } = useDashboardData(selectedPeriodId !== null ? [selectedPeriodId] : []);

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

  const withoutRoom = subjects.flatMap((subject) =>
    subject.schedules
      .filter((slot) => !slot.room)
      .map((slot) => ({ subject, slot })),
  );

  return (
    <div>
      <PageHeader
        title="Mapa"
        description={`Em quais salas suas aulas acontecem em ${selectedPeriod?.label ?? "..."}.`}
      />

      {loading ? (
        <SkeletonRows rows={6} />
      ) : weekBlocks.length === 0 ? (
        <EmptyState icon={MapPin} title="Nenhum horário de aula cadastrado ainda" />
      ) : (
        <div className="calendar-layout">
          <section>
            <h3 className="calendar-layout__heading">Salas da semana</h3>
            <WeeklyGrid blocks={weekBlocks} />
          </section>

          {withoutRoom.length > 0 && (
            <section>
              <h3 className="calendar-layout__heading">Sem sala definida</h3>
              <p className="calendar-layout__hint">
                Adicione a sala no horário da matéria pra ela aparecer no mapa.
              </p>
              <ul className="schedule-list">
                {withoutRoom.map(({ subject, slot }) => (
                  <li key={slot.id} className="schedule-chip">
                    <Link to={`/materias/${subject.id}`}>{subject.name}</Link>
                    <span className="schedule-chip__day">{slot.weekday}</span>
                    <span className="schedule-chip__time">
                      {slot.startTime}–{slot.endTime}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
