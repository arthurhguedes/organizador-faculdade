import { useState } from "react";
import { Link } from "react-router-dom";
import { ClipboardCheck, Plus, X } from "lucide-react";
import { usePageTitle } from "../context/PageTitleContext";
import { usePeriods } from "../context/PeriodContext";
import { useToast } from "../context/ToastContext";
import { useEntityList } from "../hooks/useEntityList";
import { assignmentsApi, examsApi, subjectsApi, ApiError } from "../api/client";
import { formatDate, formatGrade, isOverdue } from "../lib/grades";
import { PageHeader } from "../components/ui/PageHeader";
import { EmptyState } from "../components/ui/EmptyState";
import { SkeletonRows } from "../components/ui/Skeleton";
import { Button } from "../components/ui/Button";
import { Field } from "../components/ui/Field";
import { Badge } from "../components/ui/Badge";
import { ConfirmDelete } from "../components/ui/ConfirmDelete";
import { ErrorBanner } from "../components/ui/ErrorBanner";

type Kind = "assignment" | "exam";

type Item = {
  id: number;
  kind: Kind;
  subjectId: number;
  subjectName: string;
  title: string;
  date: string;
  weight: number;
  grade: number | null;
};

type StatusFilter = "todas" | "pendentes" | "atrasadas";

export function Evaluations() {
  usePageTitle("Provas e Atividades");
  const { selectedPeriod, selectedPeriodId } = usePeriods();
  const { notify } = useToast();

  const { items: subjects, loading: subjectsLoading, error: subjectsError } = useEntityList(subjectsApi);
  const {
    items: assignments,
    loading: assignmentsLoading,
    error: assignmentsError,
    create: createAssignment,
    update: updateAssignment,
    remove: removeAssignment,
  } = useEntityList(assignmentsApi);
  const {
    items: exams,
    loading: examsLoading,
    error: examsError,
    create: createExam,
    update: updateExam,
    remove: removeExam,
  } = useEntityList(examsApi);

  const [kindFilter, setKindFilter] = useState<"todas" | Kind>("todas");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("todas");

  const [formOpen, setFormOpen] = useState(false);
  const [formKind, setFormKind] = useState<Kind>("assignment");
  const [formSubjectId, setFormSubjectId] = useState("");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [weight, setWeight] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [gradeDraft, setGradeDraft] = useState("");

  const loading = subjectsLoading || assignmentsLoading || examsLoading;
  const error = subjectsError ?? assignmentsError ?? examsError;

  const periodSubjects = subjects.filter((s) => s.periodId === selectedPeriodId);
  const periodSubjectIds = new Set(periodSubjects.map((s) => s.id));
  const subjectName = (id: number) => subjects.find((s) => s.id === id)?.name ?? "—";

  const allItems: Item[] = [
    ...assignments
      .filter((a) => periodSubjectIds.has(a.subjectId))
      .map((a) => ({
        id: a.id,
        kind: "assignment" as const,
        subjectId: a.subjectId,
        subjectName: subjectName(a.subjectId),
        title: a.title,
        date: a.dueDate,
        weight: a.weight,
        grade: a.grade,
      })),
    ...exams
      .filter((e) => periodSubjectIds.has(e.subjectId))
      .map((e) => ({
        id: e.id,
        kind: "exam" as const,
        subjectId: e.subjectId,
        subjectName: subjectName(e.subjectId),
        title: e.title,
        date: e.date,
        weight: e.weight,
        grade: e.grade,
      })),
  ].sort((a, b) => a.date.localeCompare(b.date));

  const filteredItems = allItems.filter((item) => {
    if (kindFilter !== "todas" && item.kind !== kindFilter) return false;
    if (statusFilter === "pendentes" && item.grade !== null) return false;
    if (statusFilter === "atrasadas" && !(item.grade === null && isOverdue(item.date))) return false;
    return true;
  });

  const itemKey = (kind: Kind, id: number) => `${kind}-${id}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !date || !weight || !formSubjectId) return;
    const subjectId = Number(formSubjectId);
    const ok =
      formKind === "assignment"
        ? await createAssignment({ subjectId, title, dueDate: date, weight: Number(weight), grade: null }, "Atividade adicionada")
        : await createExam({ subjectId, title, date, weight: Number(weight), grade: null }, "Prova adicionada");
    if (ok) {
      setTitle("");
      setDate("");
      setWeight("");
      setFormSubjectId("");
      setFormOpen(false);
    }
  };

  const startEditingGrade = (item: Item) => {
    setEditingId(itemKey(item.kind, item.id));
    setGradeDraft(item.grade === null ? "" : String(item.grade));
  };

  const saveGrade = async (item: Item) => {
    const value = gradeDraft.trim() === "" ? null : Number(gradeDraft);
    try {
      if (item.kind === "assignment") {
        await updateAssignment(item.id, { subjectId: item.subjectId, title: item.title, dueDate: item.date, weight: item.weight, grade: value }, "Nota atualizada");
      } else {
        await updateExam(item.id, { subjectId: item.subjectId, title: item.title, date: item.date, weight: item.weight, grade: value }, "Nota atualizada");
      }
    } catch (err) {
      notify(err instanceof ApiError ? err.message : "Erro ao atualizar nota", "error");
    }
    setEditingId(null);
  };

  const deleteItem = async (item: Item) => {
    if (item.kind === "assignment") {
      await removeAssignment(item.id, "Atividade removida");
    } else {
      await removeExam(item.id, "Prova removida");
    }
  };

  return (
    <div>
      <PageHeader
        title={`Provas e Atividades de ${selectedPeriod?.label ?? "..."}`}
        description="Gerencie provas e atividades de todas as matérias do período em um só lugar."
        action={
          selectedPeriodId && (
            <Button variant="primary" icon={formOpen ? X : Plus} onClick={() => setFormOpen((v) => !v)}>
              {formOpen ? "Cancelar" : "Nova"}
            </Button>
          )
        }
      />

      {error && <ErrorBanner message={error} />}

      {formOpen && (
        <form className="inline-form" onSubmit={handleSubmit}>
          <label className="field">
            <span className="field__label">Tipo</span>
            <select className="field__input" value={formKind} onChange={(e) => setFormKind(e.target.value as Kind)}>
              <option value="assignment">Atividade</option>
              <option value="exam">Prova</option>
            </select>
          </label>
          <label className="field">
            <span className="field__label">Matéria</span>
            <select className="field__input" value={formSubjectId} onChange={(e) => setFormSubjectId(e.target.value)} required>
              <option value="" disabled>
                Selecione
              </option>
              {periodSubjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <Field label="Título" value={title} onChange={(e) => setTitle(e.target.value)} required />
          <Field label={formKind === "assignment" ? "Entrega" : "Data"} type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          <Field label="Peso" type="number" step="any" min="0" value={weight} onChange={(e) => setWeight(e.target.value)} required />
          <Button type="submit" variant="primary">
            Salvar
          </Button>
        </form>
      )}

      <div className="segmented-group">
        <div className="segmented">
          {(["todas", "assignment", "exam"] as const).map((k) => (
            <button
              key={k}
              type="button"
              className={`segmented__option${kindFilter === k ? " segmented__option--active" : ""}`}
              onClick={() => setKindFilter(k)}
            >
              {k === "todas" ? "Todas" : k === "assignment" ? "Atividades" : "Provas"}
            </button>
          ))}
        </div>
        <div className="segmented">
          {(["todas", "pendentes", "atrasadas"] as const).map((s) => (
            <button
              key={s}
              type="button"
              className={`segmented__option${statusFilter === s ? " segmented__option--active" : ""}`}
              onClick={() => setStatusFilter(s)}
            >
              {s === "todas" ? "Todas" : s === "pendentes" ? "Pendentes" : "Atrasadas"}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <SkeletonRows rows={5} />
      ) : filteredItems.length === 0 ? (
        <EmptyState icon={ClipboardCheck} title="Nada por aqui com esses filtros" />
      ) : (
        <table className="eval-table">
          <thead>
            <tr>
              <th>Matéria</th>
              <th>Tipo</th>
              <th>Título</th>
              <th>Data</th>
              <th>Peso</th>
              <th>Nota</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {filteredItems.map((item) => {
              const key = itemKey(item.kind, item.id);
              return (
                <tr key={key}>
                  <td>
                    <Link to={`/materias/${item.subjectId}`} className="eval-table__subject-link">
                      {item.subjectName}
                    </Link>
                  </td>
                  <td>
                    <Badge tone={item.kind === "exam" ? "accent" : "neutral"}>
                      {item.kind === "exam" ? "Prova" : "Atividade"}
                    </Badge>
                  </td>
                  <td>{item.title}</td>
                  <td>
                    {formatDate(item.date)}
                    {item.grade === null && isOverdue(item.date) && <Badge tone="warning">atrasada</Badge>}
                  </td>
                  <td className="eval-table__num">{item.weight}</td>
                  <td className="eval-table__num">
                    {editingId === key ? (
                      <input
                        autoFocus
                        className="grade-input"
                        type="number"
                        step="any"
                        value={gradeDraft}
                        onChange={(e) => setGradeDraft(e.target.value)}
                        onBlur={() => saveGrade(item)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveGrade(item);
                          if (e.key === "Escape") setEditingId(null);
                        }}
                      />
                    ) : (
                      <button type="button" className="grade-pill" onClick={() => startEditingGrade(item)}>
                        {formatGrade(item.grade)}
                      </button>
                    )}
                  </td>
                  <td>
                    <ConfirmDelete onConfirm={() => deleteItem(item)} label={`Remover ${item.kind === "exam" ? "prova" : "atividade"}`} />
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
