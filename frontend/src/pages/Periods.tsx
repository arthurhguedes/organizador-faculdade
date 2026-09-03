import { useRef, useState } from "react";
import { CalendarRange, FileCheck, Plus, X } from "lucide-react";
import { usePageTitle } from "../context/PageTitleContext";
import { usePeriods } from "../context/PeriodContext";
import { periodsApi, ApiError } from "../api/client";
import { useEntityList } from "../hooks/useEntityList";
import { useToast } from "../context/ToastContext";
import { formatDate } from "../lib/grades";
import { parseHistoricoPdf, HistoricoReadError } from "../lib/historicoImport";
import { applyHistorico } from "../lib/applyHistorico";
import { PageHeader } from "../components/ui/PageHeader";
import { EmptyState } from "../components/ui/EmptyState";
import { SkeletonRows } from "../components/ui/Skeleton";
import { Button } from "../components/ui/Button";
import { Field } from "../components/ui/Field";
import { ConfirmDelete } from "../components/ui/ConfirmDelete";
import { Badge } from "../components/ui/Badge";
import { ErrorBanner } from "../components/ui/ErrorBanner";

export function Periods() {
  usePageTitle("Períodos");
  const { items: periods, loading, error, create, remove, reload } = useEntityList(periodsApi);
  const { selectedPeriodId, setSelectedPeriodId, refresh } = usePeriods();
  const { notify } = useToast();
  const [formOpen, setFormOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [importingHistorico, setImportingHistorico] = useState(false);
  const historicoInputRef = useRef<HTMLInputElement>(null);

  const handleHistoricoFile = async (file: File) => {
    setImportingHistorico(true);
    try {
      const parsed = await parseHistoricoPdf(file);
      if (parsed.entries.length === 0) {
        notify("Não encontrei nenhuma disciplina reconhecível nesse histórico", "error");
        return;
      }
      const result = await applyHistorico(parsed);
      notify(
        `${result.periodsCreated} período(s) e ${result.subjectsCreated} matéria(s) importados do histórico` +
          (result.subjectsSkipped > 0 ? ` (${result.subjectsSkipped} já existiam e foram ignoradas)` : ""),
        "success",
      );
      reload();
      refresh();
    } catch (err) {
      if (err instanceof HistoricoReadError) {
        notify(err.message, "error");
      } else {
        notify(err instanceof ApiError ? err.message : "Não consegui ler esse PDF. Confira se é o histórico escolar.", "error");
      }
    } finally {
      setImportingHistorico(false);
      if (historicoInputRef.current) historicoInputRef.current.value = "";
    }
  };

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
        title="Períodos"
        description="Cada período (semestre) guarda suas próprias matérias. Troque o período ativo pelo seletor no topo."
        action={
          <div className="page-header__actions">
            <input
              ref={historicoInputRef}
              type="file"
              accept=".pdf"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleHistoricoFile(file);
              }}
            />
            <Button
              variant="secondary"
              icon={FileCheck}
              loading={importingHistorico}
              onClick={() => historicoInputRef.current?.click()}
            >
              {importingHistorico ? "Lendo PDF..." : "Importar histórico (PDF)"}
            </Button>
            <Button variant="primary" icon={formOpen ? X : Plus} onClick={() => setFormOpen((v) => !v)}>
              {formOpen ? "Cancelar" : "Novo período"}
            </Button>
          </div>
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
