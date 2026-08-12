import { useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, CheckSquare, Plus, Square, Trash2, X } from "lucide-react";
import { usePageTitle } from "../context/PageTitleContext";
import { usePeriods } from "../context/PeriodContext";
import { subjectsApi, professorsApi, ApiError } from "../api/client";
import { useEntityList } from "../hooks/useEntityList";
import { useToast } from "../context/ToastContext";
import { PageHeader } from "../components/ui/PageHeader";
import { EmptyState } from "../components/ui/EmptyState";
import { SkeletonCards } from "../components/ui/Skeleton";
import { Button } from "../components/ui/Button";
import { Field } from "../components/ui/Field";
import { ConfirmDelete } from "../components/ui/ConfirmDelete";
import { ErrorBanner } from "../components/ui/ErrorBanner";

export function Subjects() {
  usePageTitle("Matérias");
  const { selectedPeriod, selectedPeriodId } = usePeriods();
  const { items: subjects, loading, error, create, remove, reload } = useEntityList(subjectsApi);
  const { items: professors } = useEntityList(professorsApi);
  const { notify } = useToast();
  const [formOpen, setFormOpen] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [workload, setWorkload] = useState("");
  const [professorId, setProfessorId] = useState("");
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const periodSubjects = subjects.filter((s) => s.periodId === selectedPeriodId);

  const professorName = (id: number) => professors.find((p) => p.id === id)?.name ?? "—";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPeriodId || !professorId || !name || !workload) return;
    const ok = await create(
      {
        name,
        code: code || null,
        workload: Number(workload),
        periodId: selectedPeriodId,
        professorId: Number(professorId),
      },
      "Matéria criada",
    );
    if (ok) {
      setName("");
      setCode("");
      setWorkload("");
      setProfessorId("");
      setFormOpen(false);
    }
  };

  const toggleSelectMode = () => {
    setSelectMode((v) => !v);
    setSelectedIds(new Set());
  };

  const toggleSelected = (id: number) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkDelete = async () => {
    setBulkDeleting(true);
    let succeeded = 0;
    for (const id of selectedIds) {
      try {
        await subjectsApi.remove(id);
        succeeded++;
      } catch (err) {
        notify(err instanceof ApiError ? err.message : `Erro ao remover matéria #${id}`, "error");
      }
    }
    notify(`${succeeded} matéria(s) removida(s)`, "success");
    setSelectedIds(new Set());
    setSelectMode(false);
    setBulkDeleting(false);
    reload();
  };

  return (
    <div>
      <PageHeader
        title={`Matérias de ${selectedPeriod?.label ?? "..."}`}
        description="Toda matéria concentra seus horários, atividades e provas em um só lugar."
        action={
          selectedPeriodId && (
            <div className="page-header__actions">
              {periodSubjects.length > 0 && (
                <Button variant="secondary" icon={selectMode ? X : CheckSquare} onClick={toggleSelectMode}>
                  {selectMode ? "Cancelar seleção" : "Selecionar"}
                </Button>
              )}
              <Button variant="primary" icon={formOpen ? X : Plus} onClick={() => setFormOpen((v) => !v)}>
                {formOpen ? "Cancelar" : "Nova matéria"}
              </Button>
            </div>
          )
        }
      />

      {error && <ErrorBanner message={error} />}

      {selectMode && (
        <div className="bulk-bar">
          <span>{selectedIds.size} selecionada(s)</span>
          <Button
            variant="danger"
            icon={Trash2}
            disabled={selectedIds.size === 0}
            loading={bulkDeleting}
            loadingText="Excluindo..."
            onClick={handleBulkDelete}
          >
            Remover selecionadas
          </Button>
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
          <label className="field">
            <span className="field__label">Professor</span>
            <select
              className="field__input"
              value={professorId}
              onChange={(e) => setProfessorId(e.target.value)}
              required
            >
              <option value="" disabled>
                Selecione
              </option>
              {professors.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <Button type="submit" variant="primary">
            Salvar
          </Button>
        </form>
      )}

      {loading ? (
        <SkeletonCards cards={4} />
      ) : periodSubjects.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="Nenhuma matéria neste período"
          description="Cadastre a primeira matéria para começar a organizar este semestre."
        />
      ) : (
        <div className="subject-grid">
          {periodSubjects.map((subject, index) => {
            const selected = selectedIds.has(subject.id);
            const cardContent = (
              <>
                <span className="subject-card__name">
                  {subject.code && <span className="subject-card__code">{subject.code}</span>}
                  {subject.name}
                </span>
                <span className="subject-card__meta">{professorName(subject.professorId)} · {subject.workload}h</span>
              </>
            );

            return (
              <div
                key={subject.id}
                className={`subject-card subject-card--list stagger-in${selected ? " subject-card--selected" : ""}`}
                style={{ "--i": index } as React.CSSProperties}
              >
                {selectMode ? (
                  <button type="button" className="subject-card__link subject-card__select" onClick={() => toggleSelected(subject.id)}>
                    {selected ? <CheckSquare size={17} strokeWidth={2} /> : <Square size={17} strokeWidth={2} />}
                    <span className="subject-card__select-text">{cardContent}</span>
                  </button>
                ) : (
                  <Link to={`/materias/${subject.id}`} className="subject-card__link">
                    {cardContent}
                  </Link>
                )}
                {!selectMode && <ConfirmDelete onConfirm={() => remove(subject.id, "Matéria removida")} label="Remover matéria" />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
