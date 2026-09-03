import { useState } from "react";
import { CalendarRange, Plus, X } from "lucide-react";
import { usePeriods } from "../../context/PeriodContext";
import { periodsApi } from "../../api/client";
import { useEntityList } from "../../hooks/useEntityList";
import { formatDate } from "../../lib/grades";
import { PageHeader } from "../../components/ui/PageHeader";
import { EmptyState } from "../../components/ui/EmptyState";
import { SkeletonRows } from "../../components/ui/Skeleton";
import { Button } from "../../components/ui/Button";
import { Field } from "../../components/ui/Field";
import { ConfirmDelete } from "../../components/ui/ConfirmDelete";
import { Badge } from "../../components/ui/Badge";
import { ErrorBanner } from "../../components/ui/ErrorBanner";

export function PeriodsTab() {
  const { items: periods, loading, error, create, remove } = useEntityList(periodsApi);
  const { selectedPeriodId, setSelectedPeriodId, refresh } = usePeriods();
  const [formOpen, setFormOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!label || !startDate || !endDate) return;
    const ok = await create({ label, startDate, endDate }, "Período criado");
    if (ok) {
      setLabel("");
      setStartDate("");
      setEndDate("");
      setFormOpen(false);
      refresh();
    }
  };

  const handleRemove = async (id: number) => {
    const ok = await remove(id, "Período removido");
    if (ok) refresh();
  };

  return (
    <div>
      <PageHeader
        description="Cada período (semestre) guarda suas próprias matérias. Troque o período ativo pelo seletor no topo."
        action={
          <Button variant="primary" icon={formOpen ? X : Plus} onClick={() => setFormOpen((v) => !v)}>
            {formOpen ? "Cancelar" : "Novo período"}
          </Button>
        }
      />

      {error && <ErrorBanner message={error} />}

      {formOpen && (
        <form className="inline-form" onSubmit={handleSubmit}>
          <Field label="Label (ex: 2026/1)" value={label} onChange={(e) => setLabel(e.target.value)} required />
          <Field label="Início" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
          <Field label="Fim" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
          <Button type="submit" variant="primary">
            Salvar
          </Button>
        </form>
      )}

      {loading ? (
        <SkeletonRows rows={3} />
      ) : periods.length === 0 ? (
        <EmptyState icon={CalendarRange} title="Nenhum período cadastrado ainda" />
      ) : (
        <ul className="list-rows">
          {periods.map((period) => (
            <li key={period.id} className="list-row">
              <div className="list-row__main">
                <span className="list-row__title">{period.label}</span>
                <span className="list-row__subtitle">
                  {formatDate(period.startDate)} – {formatDate(period.endDate)}
                </span>
              </div>
              {period.id === selectedPeriodId && <Badge tone="accent">ativo</Badge>}
              <div className="list-row__actions">
                {period.id !== selectedPeriodId && (
                  <Button variant="ghost" onClick={() => setSelectedPeriodId(period.id)}>
                    Ativar
                  </Button>
                )}
                <ConfirmDelete onConfirm={() => handleRemove(period.id)} label="Remover período" />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
