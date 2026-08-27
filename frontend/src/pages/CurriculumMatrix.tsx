import { useEffect, useRef, useState } from "react";
import { FileCheck, GraduationCap, Plus, X } from "lucide-react";
import { usePageTitle } from "../context/PageTitleContext";
import { usePeriods } from "../context/PeriodContext";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { curriculumSubjectsApi, subjectsApi, ApiError } from "../api/client";
import { useEntityList } from "../hooks/useEntityList";
import { curriculumProgress } from "../lib/curriculum";
import { parseCurriculumMatrixPdf, recallElectiveOptions } from "../lib/curriculumMatrixImport";
import type { ElectiveOption } from "../lib/curriculumMatrixImport";
import { applyCurriculumMatrix, resolveCurriculumStatus } from "../lib/applyCurriculumMatrix";
import type { CurriculumKind, CurriculumStatus, CurriculumSubject } from "../api/types";
import { PageHeader } from "../components/ui/PageHeader";
import { EmptyState } from "../components/ui/EmptyState";
import { SkeletonCards } from "../components/ui/Skeleton";
import { Button } from "../components/ui/Button";
import { Field } from "../components/ui/Field";
import { ConfirmDelete } from "../components/ui/ConfirmDelete";
import { ErrorBanner } from "../components/ui/ErrorBanner";
import { Badge } from "../components/ui/Badge";

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

const KIND_LABELS: Record<CurriculumKind, string> = {
  obrigatoria: "Obrigatória",
  eletiva: "Eletiva",
  atividade: "Atividade",
};

const ELECTIVE_SLOT_PATTERN = /^Eletiva \d+$/;

function deriveHoursStatus(completedHours: number, workload: number): CurriculumStatus {
  if (completedHours <= 0) return "pendente";
  if (completedHours >= workload) return "concluida";
  return "cursando";
}

export function CurriculumMatrix() {
  usePageTitle("Matriz Curricular");
  const { items, loading, error, create, update, remove, reload } = useEntityList(curriculumSubjectsApi);
  const { selectedPeriodId } = usePeriods();
  const { user } = useAuth();
  const { notify } = useToast();
  const [formOpen, setFormOpen] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [workload, setWorkload] = useState("");
  const [suggestedPeriod, setSuggestedPeriod] = useState("");
  const [status, setStatus] = useState<CurriculumStatus>("pendente");
  const [kind, setKind] = useState<CurriculumKind>("obrigatoria");
  const [importing, setImporting] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);
  const [electiveOptions, setElectiveOptions] = useState<ElectiveOption[]>([]);
  const [pickingSlotId, setPickingSlotId] = useState<number | null>(null);
  const [editingHoursId, setEditingHoursId] = useState<number | null>(null);
  const [hoursDraft, setHoursDraft] = useState("");

  useEffect(() => {
    if (user) setElectiveOptions(recallElectiveOptions(user.id));
  }, [user]);

  const handleImportFile = async (file: File) => {
    if (!user) return;
    setImporting(true);
    try {
      const parsed = await parseCurriculumMatrixPdf(file);
      if (parsed.obrigatorias.length === 0) {
        notify("Não encontrei nenhuma disciplina obrigatória reconhecível nesse PDF", "error");
        return;
      }
      const subjects = await subjectsApi.list();
      const result = await applyCurriculumMatrix(parsed, items, subjects, selectedPeriodId, user.id);
      setElectiveOptions(parsed.electiveOptions);
      notify(
        `${result.created} matéria(s) adicionada(s) e ${result.updated} atualizada(s) a partir da matriz` +
          (result.electiveSlotsCreated > 0 ? ` (${result.electiveSlotsCreated} vaga(s) de eletiva)` : "") +
          (result.statusResolved > 0 ? ` — ${result.statusResolved} com status atualizado pelo histórico` : ""),
        "success",
      );
      reload();
    } catch (err) {
      notify(err instanceof ApiError ? err.message : "Não consegui ler esse PDF. Confira se é a matriz curricular.", "error");
    } finally {
      setImporting(false);
      if (importInputRef.current) importInputRef.current.value = "";
    }
  };

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
        kind,
        completedHours: 0,
      },
      "Matéria adicionada à matriz",
    );
    if (ok) {
      setName("");
      setCode("");
      setWorkload("");
      setSuggestedPeriod("");
      setStatus("pendente");
      setKind("obrigatoria");
      setFormOpen(false);
    }
  };

  const changeStatus = (id: number, next: CurriculumStatus) => {
    const item = items.find((i) => i.id === id);
    if (!item) return;
    update(
      id,
      {
        name: item.name,
        code: item.code,
        workload: item.workload,
        suggestedPeriod: item.suggestedPeriod,
        status: next,
        kind: item.kind,
        completedHours: item.completedHours,
      },
      "Status atualizado",
    );
  };

  const availableElectiveOptions = (slot: CurriculumSubject) => {
    const pickedCodes = new Set(
      items.filter((i) => i.kind === "eletiva" && i.code && i.id !== slot.id).map((i) => i.code),
    );
    return electiveOptions.filter((o) => !pickedCodes.has(o.code));
  };

  const handlePickElective = async (slot: CurriculumSubject, optionCode: string) => {
    const option = electiveOptions.find((o) => o.code === optionCode);
    if (!option) return;
    const subjects = await subjectsApi.list();
    const resolved = resolveCurriculumStatus({ code: option.code, name: option.name }, subjects, selectedPeriodId);
    await update(
      slot.id,
      {
        name: slot.name,
        code: option.code,
        workload: slot.workload,
        suggestedPeriod: slot.suggestedPeriod,
        status: resolved ?? slot.status,
        kind: "eletiva",
        completedHours: slot.completedHours,
      },
      `Eletiva escolhida: ${option.name}`,
    );
    setPickingSlotId(null);
  };

  const handleClearElective = async (slot: CurriculumSubject) => {
    await update(
      slot.id,
      {
        name: slot.name,
        code: null,
        workload: slot.workload,
        suggestedPeriod: slot.suggestedPeriod,
        status: "pendente",
        kind: "eletiva",
        completedHours: 0,
      },
      "Escolha removida",
    );
  };

  const startEditingHours = (item: CurriculumSubject) => {
    setEditingHoursId(item.id);
    setHoursDraft(String(item.completedHours));
  };

  const saveHours = async (item: CurriculumSubject) => {
    const raw = Number(hoursDraft);
    const clamped = Number.isFinite(raw) ? Math.max(0, Math.min(raw, item.workload)) : item.completedHours;
    setEditingHoursId(null);
    if (clamped === item.completedHours) return;
    await update(
      item.id,
      {
        name: item.name,
        code: item.code,
        workload: item.workload,
        suggestedPeriod: item.suggestedPeriod,
        status: deriveHoursStatus(clamped, item.workload),
        kind: item.kind,
        completedHours: clamped,
      },
      "Horas atualizadas",
    );
  };

  return (
    <div>
      <PageHeader
        title="Matriz Curricular"
        description="O curso inteiro: o que já foi concluído, o que está em andamento e o que ainda falta."
        action={
          <div className="page-header__actions">
            <input
              ref={importInputRef}
              type="file"
              accept=".pdf"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImportFile(file);
              }}
            />
            <Button variant="secondary" icon={FileCheck} loading={importing} onClick={() => importInputRef.current?.click()}>
              {importing ? "Lendo PDF..." : "Importar matriz (PDF)"}
            </Button>
            <Button variant="primary" icon={formOpen ? X : Plus} onClick={() => setFormOpen((v) => !v)}>
              {formOpen ? "Cancelar" : "Nova matéria"}
            </Button>
          </div>
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
            <span className="field__label">Tipo</span>
            <select className="field__input" value={kind} onChange={(e) => setKind(e.target.value as CurriculumKind)}>
              {Object.entries(KIND_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
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
            {sorted.map((item) => {
              const isElectiveSlot = item.kind === "eletiva" && ELECTIVE_SLOT_PATTERN.test(item.name);
              const pickedOption = isElectiveSlot ? electiveOptions.find((o) => o.code === item.code) : undefined;
              const isAtividade = item.kind === "atividade";

              return (
                <tr key={item.id}>
                  <td>{item.suggestedPeriod ?? "—"}</td>
                  <td>
                    {isElectiveSlot ? (
                      <div className="curriculum-elective-cell">
                        <span className="list-row__title">
                          {item.name}
                          {item.kind !== "obrigatoria" && <Badge tone="muted">{KIND_LABELS[item.kind]}</Badge>}
                        </span>
                        <span className="list-row__subtitle">
                          {item.code ? `${item.code} — ${pickedOption?.name ?? item.code}` : "Não escolhida ainda"}
                        </span>
                        <div className="curriculum-elective-cell__actions">
                          <Button variant="ghost" onClick={() => setPickingSlotId(pickingSlotId === item.id ? null : item.id)}>
                            {item.code ? "Trocar" : "Escolher"}
                          </Button>
                          {item.code && (
                            <Button variant="ghost" onClick={() => handleClearElective(item)}>
                              Limpar
                            </Button>
                          )}
                        </div>
                        {pickingSlotId === item.id && (
                          <select
                            autoFocus
                            className="field__input"
                            defaultValue=""
                            onChange={(e) => {
                              if (e.target.value) handlePickElective(item, e.target.value);
                            }}
                          >
                            <option value="">
                              {electiveOptions.length === 0 ? "Importe a matriz pra ver as opções" : "— escolher eletiva —"}
                            </option>
                            {availableElectiveOptions(item).map((option) => (
                              <option key={option.code} value={option.code}>
                                {option.code} — {option.name}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    ) : (
                      <>
                        {item.code && <span className="subject-card__code">{item.code}</span>}
                        {item.name}
                        {item.kind !== "obrigatoria" && <Badge tone="muted">{KIND_LABELS[item.kind]}</Badge>}
                      </>
                    )}
                  </td>
                  <td className="eval-table__num">
                    {isAtividade ? (
                      editingHoursId === item.id ? (
                        <input
                          autoFocus
                          className="grade-input"
                          type="number"
                          min="0"
                          max={item.workload}
                          value={hoursDraft}
                          onChange={(e) => setHoursDraft(e.target.value)}
                          onBlur={() => saveHours(item)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveHours(item);
                            if (e.key === "Escape") setEditingHoursId(null);
                          }}
                        />
                      ) : (
                        <button type="button" className="grade-pill" onClick={() => startEditingHours(item)}>
                          {item.completedHours}/{item.workload}h
                        </button>
                      )
                    ) : (
                      `${item.workload}h`
                    )}
                  </td>
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
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
