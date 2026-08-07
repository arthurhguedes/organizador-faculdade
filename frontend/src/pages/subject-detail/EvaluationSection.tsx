import { useState } from "react";
import { ClipboardList, GraduationCap, Plus, X } from "lucide-react";
import { formatDate, formatGrade, isOverdue } from "../../lib/grades";
import { EmptyState } from "../../components/ui/EmptyState";
import { Button } from "../../components/ui/Button";
import { Field } from "../../components/ui/Field";
import { Badge } from "../../components/ui/Badge";
import { ConfirmDelete } from "../../components/ui/ConfirmDelete";

export type EvalItem = {
  id: number;
  title: string;
  date: string;
  weight: number;
  grade: number | null;
};

export function EvaluationSection({
  kind,
  items,
  onCreate,
  onUpdateGrade,
  onDelete,
}: {
  kind: "assignment" | "exam";
  items: EvalItem[];
  onCreate: (input: { title: string; date: string; weight: number }) => Promise<void>;
  onUpdateGrade: (id: number, grade: number | null) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}) {
  const [formOpen, setFormOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [weight, setWeight] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [gradeDraft, setGradeDraft] = useState("");

  const label = kind === "assignment" ? "Atividades" : "Provas";
  const singular = kind === "assignment" ? "atividade" : "prova";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !date || !weight) return;
    await onCreate({ title, date, weight: Number(weight) });
    setTitle("");
    setDate("");
    setWeight("");
    setFormOpen(false);
  };

  const startEditingGrade = (item: EvalItem) => {
    setEditingId(item.id);
    setGradeDraft(item.grade === null ? "" : String(item.grade));
  };

  const saveGrade = async (id: number) => {
    const value = gradeDraft.trim() === "" ? null : Number(gradeDraft);
    await onUpdateGrade(id, value);
    setEditingId(null);
  };

  return (
    <section className="hub-section">
      <div className="hub-section__header">
        <h3>{label}</h3>
        <Button variant="ghost" icon={formOpen ? X : Plus} onClick={() => setFormOpen((v) => !v)}>
          {formOpen ? "Cancelar" : "Adicionar"}
        </Button>
      </div>

      {formOpen && (
        <form className="inline-form inline-form--compact" onSubmit={handleSubmit}>
          <Field label="Título" value={title} onChange={(e) => setTitle(e.target.value)} required />
          <Field label={kind === "assignment" ? "Entrega" : "Data"} type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          <Field label="Peso" type="number" step="any" min="0" value={weight} onChange={(e) => setWeight(e.target.value)} required />
          <Button type="submit" variant="primary">
            Salvar
          </Button>
        </form>
      )}

      {items.length === 0 ? (
        <EmptyState
          icon={kind === "assignment" ? ClipboardList : GraduationCap}
          title={`Nenhuma ${singular} cadastrada ainda`}
        />
      ) : (
        <table className="eval-table">
          <thead>
            <tr>
              <th>Título</th>
              <th>{kind === "assignment" ? "Entrega" : "Data"}</th>
              <th>Peso</th>
              <th>Nota</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>{item.title}</td>
                <td>
                  {formatDate(item.date)}
                  {item.grade === null && isOverdue(item.date) && <Badge tone="warning">atrasada</Badge>}
                </td>
                <td className="eval-table__num">{item.weight}</td>
                <td className="eval-table__num">
                  {editingId === item.id ? (
                    <input
                      autoFocus
                      className="grade-input"
                      type="number"
                      step="any"
                      value={gradeDraft}
                      onChange={(e) => setGradeDraft(e.target.value)}
                      onBlur={() => saveGrade(item.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveGrade(item.id);
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
                  <ConfirmDelete onConfirm={() => onDelete(item.id)} label={`Remover ${singular}`} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
