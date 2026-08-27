import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { ChevronLeft, Pencil, X, BookOpen, SearchX } from "lucide-react";
import { usePageTitle } from "../context/PageTitleContext";
import { usePeriods } from "../context/PeriodContext";
import { useToast } from "../context/ToastContext";
import { useEntityList } from "../hooks/useEntityList";
import { professorsApi, subjectsApi, ApiError } from "../api/client";
import type { Professor } from "../api/types";
import { Button } from "../components/ui/Button";
import { Field } from "../components/ui/Field";
import { ConfirmDelete } from "../components/ui/ConfirmDelete";
import { SkeletonRows } from "../components/ui/Skeleton";
import { EmptyState } from "../components/ui/EmptyState";

export function ProfessorDetail() {
  const { id } = useParams();
  const professorId = Number(id);
  const navigate = useNavigate();
  const { notify } = useToast();
  const { periods } = usePeriods();
  const { items: subjects } = useEntityList(subjectsApi);

  const [professor, setProfessor] = useState<Professor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!Number.isFinite(professorId)) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    professorsApi
      .get(professorId)
      .then(setProfessor)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Erro ao carregar professor"))
      .finally(() => setLoading(false));
  }, [professorId]);

  useEffect(() => {
    load();
  }, [load]);

  usePageTitle(professor?.name ?? "Professor");

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [savingProfessor, setSavingProfessor] = useState(false);

  useEffect(() => {
    if (professor) {
      setName(professor.name);
      setEmail(professor.email);
    }
  }, [professor]);

  if (loading) {
    return <SkeletonRows rows={6} />;
  }

  if (error) {
    return (
      <EmptyState
        icon={SearchX}
        title="Não foi possível carregar este professor"
        description={error}
        action={
          <Button variant="secondary" onClick={load}>
            Tentar novamente
          </Button>
        }
      />
    );
  }

  if (!professor) {
    return <EmptyState icon={SearchX} title="Professor não encontrado" />;
  }

  const taughtSubjects = subjects.filter((s) => s.professorId === professorId);
  const periodLabel = (periodId: number) => periods.find((p) => p.id === periodId)?.label ?? "—";

  const saveProfessor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || savingProfessor) return;
    setSavingProfessor(true);
    try {
      const [updated] = await professorsApi.update(professorId, { name, email });
      setProfessor(updated);
      notify("Professor atualizado", "success");
      setEditing(false);
    } catch (err) {
      notify(err instanceof ApiError ? err.message : "Erro ao atualizar professor", "error");
    } finally {
      setSavingProfessor(false);
    }
  };

  const deleteProfessor = async () => {
    try {
      await professorsApi.remove(professorId);
      notify("Professor e matérias vinculadas removidos", "success");
      navigate("/professores");
    } catch (err) {
      notify(err instanceof ApiError ? err.message : "Erro ao remover professor", "error");
    }
  };

  return (
    <div>
      <Link to="/professores" className="link-with-icon back-link">
        <ChevronLeft size={15} strokeWidth={2} /> Meus Professores
      </Link>

      {editing ? (
        <form className="inline-form" onSubmit={saveProfessor}>
          <Field label="Nome" value={name} onChange={(e) => setName(e.target.value)} required />
          <Field label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Button type="submit" variant="primary" loading={savingProfessor}>
            Salvar
          </Button>
          <Button type="button" variant="ghost" icon={X} onClick={() => setEditing(false)} disabled={savingProfessor}>
            Cancelar
          </Button>
        </form>
      ) : (
        <div className="subject-hub-header">
          <div>
            <h2 className="subject-hub-header__name">{professor.name}</h2>
            <p className="subject-hub-header__meta">
              {professor.email} · {taughtSubjects.length} matéria{taughtSubjects.length === 1 ? "" : "s"}
            </p>
          </div>
          <div className="subject-hub-header__actions">
            <Button variant="ghost" icon={Pencil} onClick={() => setEditing(true)}>
              Editar
            </Button>
            <ConfirmDelete
              onConfirm={deleteProfessor}
              label="Remover professor"
              confirmText="Remover professor e matérias?"
            />
          </div>
        </div>
      )}

      <section className="hub-section">
        <div className="hub-section__header">
          <h3>Matérias que leciona</h3>
        </div>

        {taughtSubjects.length === 0 ? (
          <EmptyState icon={BookOpen} title="Nenhuma matéria vinculada a este professor ainda" />
        ) : (
          <div className="subject-grid">
            {taughtSubjects.map((subject) => (
              <div key={subject.id} className="subject-card subject-card--list">
                <Link to={`/materias/${subject.id}`} className="subject-card__link">
                  <span className="subject-card__name">
                    {subject.code && <span className="subject-card__code">{subject.code}</span>}
                    {subject.name}
                  </span>
                  <span className="subject-card__meta">
                    {periodLabel(subject.periodId)} · {subject.workload}h
                  </span>
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
