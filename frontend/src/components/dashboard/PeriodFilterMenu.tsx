import { useEffect, useRef, useState } from "react";
import { ChevronDown, CalendarRange } from "lucide-react";
import type { Period } from "../../api/types";

type PeriodFilterMenuProps = {
  periods: Period[];
  selectedIds: Set<number>;
  onToggle: (id: number) => void;
  onToggleAll: () => void;
};

export function describePeriodSelection(periods: Period[], selectedIds: Set<number>): string {
  if (selectedIds.size === 0) return "nenhum período";
  if (periods.length > 1 && selectedIds.size === periods.length) return "todos os períodos";
  const labels = periods.filter((p) => selectedIds.has(p.id)).map((p) => p.label);
  if (labels.length <= 2) return labels.join(" e ");
  return `${labels.length} períodos`;
}

export function PeriodFilterMenu({ periods, selectedIds, onToggle, onToggleAll }: PeriodFilterMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  if (periods.length <= 1) return null;

  const allSelected = selectedIds.size === periods.length;

  return (
    <div className="period-filter" ref={rootRef}>
      <button
        type="button"
        className="period-filter__trigger"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <CalendarRange size={14} strokeWidth={2} />
        <span>{describePeriodSelection(periods, selectedIds)}</span>
        <ChevronDown size={13} strokeWidth={2} />
      </button>

      {open && (
        <div className="period-filter__panel">
          <label className="period-filter__option period-filter__option--all">
            <input type="checkbox" checked={allSelected} onChange={onToggleAll} />
            <span>Todos os períodos</span>
          </label>
          <div className="period-filter__divider" />
          {periods.map((period) => (
            <label className="period-filter__option" key={period.id}>
              <input
                type="checkbox"
                checked={selectedIds.has(period.id)}
                onChange={() => onToggle(period.id)}
              />
              <span>{period.label}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
