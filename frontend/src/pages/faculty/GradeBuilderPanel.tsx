import { useMemo, useState } from "react";
import { CalendarCheck, X, AlertTriangle } from "lucide-react";
import type { Offering } from "../../api/types";
import { WeeklyGrid, type WeeklyGridBlock } from "../../components/grid/WeeklyGrid";
import { findConflictingIds } from "../../lib/scheduleConflicts";
import { confirmGrade } from "../../lib/confirmGrade";
import { usePeriods } from "../../context/PeriodContext";
import { useToast } from "../../context/ToastContext";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";

export function GradeBuilderPanel({
  selectedOfferings,
  onRemove,
  onConfirmed,
}: {
  selectedOfferings: Offering[];
  onRemove: (id: number) => void;
  onConfirmed: () => void;
}) {
  const { selectedPeriodId, selectedPeriod } = usePeriods();
  const { notify } = useToast();
  const [confirming, setConfirming] = useState(false);

  const conflictingIds = useMemo(() => findConflictingIds(selectedOfferings), [selectedOfferings]);

  const blocks: WeeklyGridBlock[] = selectedOfferings.flatMap((offering) =>
    offering.schedules.map((slot) => ({
      id: `${offering.id}-${slot.id}`,
      label: offering.subjectCode,
      sublabel: offering.turma,
      weekday: slot.weekday,
      startTime: slot.startTime,
      endTime: slot.endTime,
      tone: conflictingIds.has(offering.id) ? "danger" : "accent",
    })),
  );

  const handleConfirm = async () => {
    if (!selectedPeriodId) {
      notify("Selecione um período antes de confirmar", "error");
      return;
    }
    setConfirming(true);
    try {
      await confirmGrade(selectedOfferings, selectedPeriodId);
      notify(`${selectedOfferings.length} matéria(s) adicionada(s) a ${selectedPeriod?.label}`, "success");
      onConfirmed();
    } catch {
      notify("Erro ao confirmar a grade", "error");
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div className="grade-builder">
      <h3>Grade em construção</h3>

      {selectedOfferings.length === 0 ? (
        <EmptyState
          icon={CalendarCheck}
          title="Nenhuma turma selecionada"
          description="Adicione turmas na lista ao lado para montar sua grade."
        />
      ) : (
        <>
          <WeeklyGrid blocks={blocks} />

          {conflictingIds.size > 0 && (
            <p className="grade-builder__warning">
              <AlertTriangle size={14} strokeWidth={2} />
              Há turmas com horário conflitante — remova uma delas antes de confirmar.
            </p>
          )}

          <ul className="grade-builder__list">
            {selectedOfferings.map((offering) => (
              <li key={offering.id} className={conflictingIds.has(offering.id) ? "grade-builder__item--conflict" : ""}>
                <span>
                  {offering.subjectCode} · turma {offering.turma}
                </span>
                <button type="button" className="icon-btn" onClick={() => onRemove(offering.id)} aria-label="Remover da grade">
                  <X size={14} strokeWidth={2} />
                </button>
              </li>
            ))}
          </ul>

          <Button
            variant="primary"
            icon={CalendarCheck}
            loading={confirming}
            disabled={conflictingIds.size > 0 || !selectedPeriodId}
            onClick={handleConfirm}
          >
            Confirmar e adicionar às minhas matérias
          </Button>
        </>
      )}
    </div>
  );
}
