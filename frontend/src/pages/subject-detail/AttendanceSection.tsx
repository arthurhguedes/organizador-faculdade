import { useEffect, useRef, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { updateSubjectAbsences, ApiError } from "../../api/client";
import { maxAbsences } from "../../lib/grades";
import { useToast } from "../../context/ToastContext";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";

const SAVE_DEBOUNCE_MS = 400;

export function AttendanceSection({
  subjectId,
  workload,
  absences,
  onSaved,
}: {
  subjectId: number;
  workload: number;
  absences: number;
  onSaved: (nextAbsences: number) => void;
}) {
  const { notify } = useToast();
  const [localAbsences, setLocalAbsences] = useState(absences);
  // Ref, não state: precisa do valor mais recente de forma síncrona entre
  // cliques rápidos, sem esperar o ciclo de re-render do React (spam de
  // clique no +/- perdia incrementos por causa de closures desatualizadas).
  const valueRef = useRef(absences);
  const pendingSave = useRef(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (pendingSave.current) return;
    valueRef.current = absences;
    setLocalAbsences(absences);
  }, [absences]);

  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, []);

  const max = maxAbsences(workload);
  const remaining = Math.max(max - localAbsences, 0);
  const over = localAbsences > max;
  const close = !over && max > 0 && remaining <= max * 0.25;
  const tone = over ? "danger" : close ? "warning" : "accent";

  const bump = (delta: number) => {
    const next = Math.max(valueRef.current + delta, 0);
    valueRef.current = next;
    setLocalAbsences(next);
    pendingSave.current = true;

    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(async () => {
      try {
        await updateSubjectAbsences(subjectId, next);
        onSaved(next);
      } catch (err) {
        notify(err instanceof ApiError ? err.message : "Erro ao atualizar faltas", "error");
      } finally {
        pendingSave.current = false;
      }
    }, SAVE_DEBOUNCE_MS);
  };

  return (
    <section className="hub-section">
      <div className="hub-section__header">
        <h3>Faltas</h3>
        <Badge tone={tone}>{over ? "limite estourado" : `${remaining} restante${remaining !== 1 ? "s" : ""}`}</Badge>
      </div>

      <div className="attendance-panel">
        <div className="attendance-panel__controls">
          <Button
            variant="secondary"
            icon={Minus}
            disabled={localAbsences === 0}
            onClick={() => bump(-1)}
            aria-label="Remover uma falta"
          />
          <span className="attendance-panel__count">
            {localAbsences} <span className="attendance-panel__count-max">/ {max}</span>
          </span>
          <Button variant="secondary" icon={Plus} onClick={() => bump(1)} aria-label="Adicionar uma falta" />
        </div>
        <div className="attendance-panel__bar">
          <div
            className="attendance-panel__bar-fill"
            data-tone={tone}
            style={{ transform: `scaleX(${Math.min(localAbsences / Math.max(max, 1), 1)})` }}
          />
        </div>
        <p className="attendance-panel__hint">
          Máximo de {max} falta{max !== 1 ? "s" : ""} permitida{max !== 1 ? "s" : ""} (25% de {workload}h)
        </p>
      </div>
    </section>
  );
}
