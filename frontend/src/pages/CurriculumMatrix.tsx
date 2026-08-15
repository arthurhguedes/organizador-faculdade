import { useState } from "react";
import { GraduationCap, Plus, X } from "lucide-react";
import { usePageTitle } from "../context/PageTitleContext";
import { curriculumSubjectsApi } from "../api/client";
import { useEntityList } from "../hooks/useEntityList";
import { curriculumProgress } from "../lib/curriculum";
import type { CurriculumStatus } from "../api/types";
import { PageHeader } from "../components/ui/PageHeader";
import { EmptyState } from "../components/ui/EmptyState";
import { SkeletonCards } from "../components/ui/Skeleton";
import { Button } from "../components/ui/Button";
import { Field } from "../components/ui/Field";
import { ConfirmDelete } from "../components/ui/ConfirmDelete";
import { ErrorBanner } from "../components/ui/ErrorBanner";

const STATUS_LABELS: Record<CurriculumStatus, string> = {
  pendente: "Pendente",
  cursando: "Cursando",
  concluida: "Concluída",
};

const STATUS_TONES: Record<CurriculumStatus, "muted" | "warning" | "accent"> = {
  pendente: "muted",
  cursando: "warning",
  concluida: "accent",
};

export function CurriculumMatrix() {
  usePageTitle("Matriz Curricular");
  const { items, loading, error, create, update, remove } = useEntityList(curriculumSubjectsApi);
  const [formOpen, setFormOpen] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [workload, setWorkload] = useState("");
  const [suggestedPeriod, setSuggestedPeriod] = useState("");
  const [status, setStatus] = useState<CurriculumStatus>("pendente");

  const progress = curriculumProgress(items);
  const sorted = [...items].sort((a, b) => {
    const pa = a.suggestedPeriod ?? Infinity;
    const pb = b.suggestedPeriod ?? Infinity;
    if (pa !== pb) return pa - pb;
    return a.name.localeCompare(b.name);
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !workload) return;
    const ok = await create(
      {
        name,
        code: code || null,
        workload: Number(workload),
        suggestedPeriod: suggestedPeriod ? Number(suggestedPeriod) : null,
        status,
      },
      "Matéria adicionada à matriz",
    );
    if (ok) {
      setName("");
      setCode("");
      setWorkload("");
      setSuggestedPeriod("");
      setStatus("pendente");
      setFormOpen(false);
    }
  };

  const changeStatus = (id: number, next: CurriculumStatus) => {
    const item = items.find((i) => i.id === id);
    if (!item) return;
    update(
      id,
      { name: item.name, code: item.code, workload: item.workload, suggestedPeriod: item.suggestedPeriod, status: next },
      "Status atualizado",
    );
  };

  return (
    <div>
      <PageHeader
        title="Matriz Curricular"
        description="O curso inteiro: o que já foi concluído, o que está em andamento e o que ainda falta."
        action={
          <Button variant="primary" icon={formOpen ? X : Plus} onClick={() => setFormOpen((v) => !v)}>
            {formOpen ? "Cancelar" : "Nova matéria"}
          </Button>
        }
      />

      {error && <ErrorBanner message={error} />}

      {loading ? (
        <SkeletonCards cards={4} />
      ) : (
        <div className="stat-grid">
          <div className="stat-card">
            <span className="stat-card__label">Concluído</span>
            <span className="stat-card__value">{progress.percentComplete.toFixed(0)}%</span>
            <span className="stat-card__hint">Por carga horária</span>
          </div>
          <div className="stat-card">
            <span className="stat-card__label">Concluídas</span>
            <span className="stat-card__value">
              {progress.counts.concluida}/{items.length}
            </span>
            <span className="stat-card__hint">Matérias</span>
          </div>
          <div className="stat-card">
            <span className="stat-card__label">Cursando</span>
            <span className="stat-card__value">{progress.counts.cursando}</span>
            <span className="stat-card__hint">Matérias</span>
          </div>
          <div className="stat-card">
            <span className="stat-card__label">Pendentes</span>
            <span className="stat-card__value">{progress.counts.pendente}</span>
            <span className="stat-card__hint">Matérias</span>
          </div>
        </div>
      )}

      {formOpen && (
        <form className="inline-form" onSubmit={handleSubmit}>
          <Field label="Nome" value={name} onChange={(e) => setName(e.target.value)} required />
          <Field label="Código (opcional)" value={code} onChange={(e) => setCode(e.target.value)} />
          <Field
            label="Carga horária"
            type="number"
            min="0"
            value={workload}
            onChange={(e) => setWorkload(e.target.value)}
            required
          />
          <Field
            label="Período sugerido (opcional)"
            type="number"
            min="1"
            value={suggestedPeriod}
            onChange={(e) => setSuggestedPeriod(e.target.value)}
          />
          <label className="field">
            <span className="field__label">Status</span>
            <select className="field__input" value={status} onChange={(e) => setStatus(e.target.value as CurriculumStatus)}>
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <Button type="submit" variant="primary">
            Salvar
          </Button>
        </form>
      )}

      {!loading && items.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title="Nenhuma matéria cadastrada na matriz ainda"
          description="Adicione as matérias exigidas pelo seu curso pra acompanhar quanto falta pra concluir."
        />
      ) : (
        <table className="eval-table">
          <thead>
            <tr>
              <th>Período</th>
              <th>Matéria</th>
              <th>Carga horária</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {sorted.map((item) => (
              <tr key={item.id}>
                <td>{item.suggestedPeriod ?? "—"}</td>
                <td>
                  {item.code && <span className="subject-card__code">{item.code}</span>}
                  {item.name}
                </td>
                <td className="eval-table__num">{item.workload}h</td>
                <td>
                  <select
                    className={`field__input status-select status-select--${STATUS_TONES[item.status]}`}
                    value={item.status}
                    onChange={(e) => changeStatus(item.id, e.target.value as CurriculumStatus)}
                  >
                    {Object.entries(STATUS_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <ConfirmDelete onConfirm={() => remove(item.id, "Matéria removida da matriz")} label="Remover da matriz" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
