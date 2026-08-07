import { ChevronDown, CalendarRange } from "lucide-react";
import { usePeriods } from "../../context/PeriodContext";

export function PeriodSwitcher() {
  const { periods, selectedPeriodId, setSelectedPeriodId, loading } = usePeriods();

  if (!loading && periods.length === 0) {
    return (
      <div className="period-switcher period-switcher--empty">
        <CalendarRange size={15} strokeWidth={2} />
        <span>Nenhum período cadastrado</span>
      </div>
    );
  }

  return (
    <div className="period-switcher">
      <CalendarRange size={15} strokeWidth={2} />
      <select
        aria-label="Período letivo selecionado"
        value={selectedPeriodId ?? ""}
        disabled={loading}
        onChange={(e) => setSelectedPeriodId(e.target.value ? Number(e.target.value) : null)}
      >
        {periods.map((period) => (
          <option key={period.id} value={period.id}>
            {period.label}
          </option>
        ))}
      </select>
      <ChevronDown size={14} strokeWidth={2} className="period-switcher__chevron" />
    </div>
  );
}
