import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { ChevronLeft, Pencil, X, BookOpen, MapPin, SearchX } from "lucide-react";
import { usePageTitle } from "../context/PageTitleContext";
import { usePeriods } from "../context/PeriodContext";
import { useToast } from "../context/ToastContext";
import { useEntityList } from "../hooks/useEntityList";
import { professorsApi, subjectsApi, roomAllocationsApi, ApiError } from "../api/client";
import type { Professor, RoomAllocation } from "../api/types";
import { findAllocationsForProfessor } from "../lib/roomMatch";
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
  const [allocations, setAllocations] = useState<RoomAllocation[]>([]);

  useEffect(() => {
    roomAllocationsApi
      .list()
      .then(setAllocations)
      .catch(() => {});
  }, []);

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
  const professorAllocations = findAllocationsForProfessor(professor.name, allocations);

  const saveProfessor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) return;
    try {
      await professorsApi.update(professorId, { name, email });
      notify("Professor atualizado", "success");
      setEditing(false);
      load();
    } catch (err) {
      notify(err instanceof ApiError ? err.message : "Erro ao atualizar professor", "error");
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
          <Button type="submit" variant="primary">
            Salvar
          </Button>
          <Button type="button" variant="ghost" icon={X} onClick={() => setEditing(false)}>
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

      <section className="hub-section">
        <div className="hub-section__header">
          <h3>Salas</h3>
        </div>

        {professorAllocations.length === 0 ? (
          <EmptyState
            icon={MapPin}
            title="Nenhuma sala encontrada pra esse professor"
            description="Importe o mapa de salas no Perfil pra ver aqui onde as aulas desse professor acontecem."
          />
        ) : (
          <table className="eval-table">
            <thead>
              <tr>
                <th>Disciplina</th>
                <th>Dia</th>
                <th>Horário</th>
                <th>Sala</th>
              </tr>
            </thead>
            <tbody>
              {professorAllocations.map((allocation) => (
                <tr key={allocation.id}>
                  <td>
                    {allocation.subjectCode && <span className="subject-card__code">{allocation.subjectCode}</span>}{" "}
                    {allocation.subjectName}
                  </td>
                  <td>{allocation.weekday}</td>
                  <td>
                    {allocation.startTime}–{allocation.endTime}
                  </td>
                  <td>{allocation.room}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
