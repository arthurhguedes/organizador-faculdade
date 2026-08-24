import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MapPin } from "lucide-react";
import { usePageTitle } from "../context/PageTitleContext";
import { usePeriods } from "../context/PeriodContext";
import { useDashboardData } from "../hooks/useDashboardData";
import { roomAllocationsApi } from "../api/client";
import type { RoomAllocation } from "../api/types";
import { findRoomForSchedule } from "../lib/roomMatch";
import { WeeklyGrid, type WeeklyGridBlock } from "../components/grid/WeeklyGrid";
import { PageHeader } from "../components/ui/PageHeader";
import { EmptyState } from "../components/ui/EmptyState";
import { SkeletonRows } from "../components/ui/Skeleton";

export function Mapa() {
  usePageTitle("Mapa");
  const { selectedPeriod, selectedPeriodId } = usePeriods();
  const { subjects, loading } = useDashboardData(selectedPeriodId !== null ? [selectedPeriodId] : []);
  const [allocations, setAllocations] = useState<RoomAllocation[]>([]);
  const [allocationsLoading, setAllocationsLoading] = useState(true);

  useEffect(() => {
    roomAllocationsApi
      .list()
      .then(setAllocations)
      .catch(() => {})
      .finally(() => setAllocationsLoading(false));
  }, []);

  if (!loading && !allocationsLoading && allocations.length === 0) {
    return (
      <div>
        <PageHeader title="Mapa" description="Em quais salas suas aulas acontecem." />
        <EmptyState
          icon={MapPin}
          title="Nenhum mapa de salas importado ainda"
          description="Importe o PDF do mapa de salas da faculdade no seu Perfil pra ver aqui em qual sala cada matéria acontece."
          action={
            <Link to="/perfil" className="link-with-icon">
              Ir pro Perfil
            </Link>
          }
        />
      </div>
    );
  }

  const scheduleRoom = new Map<string | number, RoomAllocation | null>();
  const withoutRoom: { subjectId: number; subjectName: string; scheduleId: number; weekday: string; startTime: string; endTime: string }[] = [];

  for (const subject of subjects) {
    for (const slot of subject.schedules) {
      const match = findRoomForSchedule(subject, slot, allocations);
      scheduleRoom.set(slot.id, match);
      if (!match) {
        withoutRoom.push({
          subjectId: subject.id,
          subjectName: subject.name,
          scheduleId: slot.id,
          weekday: slot.weekday,
          startTime: slot.startTime,
          endTime: slot.endTime,
        });
      }
    }
  }

  const weekBlocks: WeeklyGridBlock[] = subjects.flatMap((subject) =>
    subject.schedules.map((slot) => ({
      id: `${subject.id}-${slot.id}`,
      label: subject.name,
      sublabel: scheduleRoom.get(slot.id)?.room,
      weekday: slot.weekday,
      startTime: slot.startTime,
      endTime: slot.endTime,
      tone: "accent" as const,
    })),
  );

  return (
    <div>
      <PageHeader
        title="Mapa"
        description={`Em quais salas suas aulas acontecem em ${selectedPeriod?.label ?? "..."}.`}
      />

      {loading || allocationsLoading ? (
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
              <h3 className="calendar-layout__heading">Sem sala encontrada</h3>
              <p className="calendar-layout__hint">
                Esses horários não bateram com nenhuma entrada do mapa de salas importado — confira se o código da
                matéria e o horário são os mesmos oficiais da faculdade, ou reimporte o mapa no Perfil se o semestre
                mudou.
              </p>
              <ul className="schedule-list">
                {withoutRoom.map((item) => (
                  <li key={item.scheduleId} className="schedule-chip">
                    <Link to={`/materias/${item.subjectId}`}>{item.subjectName}</Link>
                    <span className="schedule-chip__day">{item.weekday}</span>
                    <span className="schedule-chip__time">
                      {item.startTime}–{item.endTime}
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
