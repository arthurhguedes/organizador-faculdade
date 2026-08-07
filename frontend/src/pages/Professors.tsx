import { useState } from "react";
import { Users, Plus, X, Pencil } from "lucide-react";
import { usePageTitle } from "../context/PageTitleContext";
import { professorsApi } from "../api/client";
import { useEntityList } from "../hooks/useEntityList";
import { PageHeader } from "../components/ui/PageHeader";
import { EmptyState } from "../components/ui/EmptyState";
import { SkeletonRows } from "../components/ui/Skeleton";
import { Button } from "../components/ui/Button";
import { Field } from "../components/ui/Field";
import { ConfirmDelete } from "../components/ui/ConfirmDelete";
import { ErrorBanner } from "../components/ui/ErrorBanner";

export function Professors() {
  usePageTitle("Meus Professores");
  const { items: professors, loading, error, create, update, remove } = useEntityList(professorsApi);
  const [formOpen, setFormOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) return;
    const ok = await create({ name, email }, "Professor cadastrado");
    if (ok) {
      setName("");
      setEmail("");
      setFormOpen(false);
    }
  };

  const startEdit = (professor: { id: number; name: string; email: string }) => {
    setEditingId(professor.id);
    setEditName(professor.name);
    setEditEmail(professor.email);
  };

  const handleEditSubmit = async (e: React.FormEvent, id: number) => {
    e.preventDefault();
    if (!editName || !editEmail) return;
    const ok = await update(id, { name: editName, email: editEmail }, "Professor atualizado");
    if (ok) {
      setEditingId(null);
    }
  };

  return (
    <div>
      <PageHeader
        title="Meus Professores"
        description="Cadastre os professores para vincular às matérias."
        action={
          <Button variant="primary" icon={formOpen ? X : Plus} onClick={() => setFormOpen((v) => !v)}>
            {formOpen ? "Cancelar" : "Novo professor"}
          </Button>
        }
      />

      {error && <ErrorBanner message={error} />}

      {formOpen && (
        <form className="inline-form" onSubmit={handleSubmit}>
          <Field label="Nome" value={name} onChange={(e) => setName(e.target.value)} required />
          <Field label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Button type="submit" variant="primary">
            Salvar
          </Button>
        </form>
      )}

      {loading ? (
        <SkeletonRows rows={3} />
      ) : professors.length === 0 ? (
        <EmptyState icon={Users} title="Nenhum professor cadastrado ainda" />
      ) : (
        <ul className="list-rows">
          {professors.map((professor) =>
            editingId === professor.id ? (
              <li key={professor.id} className="list-row">
                <form className="inline-form" onSubmit={(e) => handleEditSubmit(e, professor.id)}>
                  <Field label="Nome" value={editName} onChange={(e) => setEditName(e.target.value)} required />
                  <Field
                    label="Email"
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    required
                  />
                  <Button type="submit" variant="primary">
                    Salvar
                  </Button>
                  <Button type="button" variant="ghost" icon={X} onClick={() => setEditingId(null)}>
                    Cancelar
                  </Button>
                </form>
              </li>
            ) : (
              <li key={professor.id} className="list-row">
                <div className="list-row__main">
                  <span className="list-row__title">{professor.name}</span>
                  <span className="list-row__subtitle">{professor.email}</span>
                </div>
                <div className="list-row__actions">
                  <Button variant="ghost" icon={Pencil} onClick={() => startEdit(professor)}>
                    Editar
                  </Button>
                  <ConfirmDelete onConfirm={() => remove(professor.id, "Professor removido")} label="Remover professor" />
                </div>
              </li>
            ),
          )}
        </ul>
      )}
    </div>
  );
}
