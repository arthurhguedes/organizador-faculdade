import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { ChevronLeft, Pencil, X } from "lucide-react";
import { usePageTitle } from "../context/PageTitleContext";
import { usePeriods } from "../context/PeriodContext";
import { useToast } from "../context/ToastContext";
import { useSubjectDetails } from "../hooks/useSubjectDetails";
import { useEntityList } from "../hooks/useEntityList";
import { useAnimatedNumber } from "../hooks/useAnimatedNumber";
import { assignmentsApi, examsApi, subjectsApi, professorsApi, ApiError } from "../api/client";
import { subjectAverage, formatGrade } from "../lib/grades";
import { AttendanceSection } from "./subject-detail/AttendanceSection";
import { ScheduleSection } from "./subject-detail/ScheduleSection";
import { EvaluationSection } from "./subject-detail/EvaluationSection";
import { SyllabusSection } from "./subject-detail/SyllabusSection";
import { SyllabusPlanningSection } from "./subject-detail/SyllabusPlanningSection";
import { Button } from "../components/ui/Button";
import { Field } from "../components/ui/Field";
import { ConfirmDelete } from "../components/ui/ConfirmDelete";
import { SkeletonRows } from "../components/ui/Skeleton";
import { EmptyState } from "../components/ui/EmptyState";
import { SearchX } from "lucide-react";

export function SubjectDetail() {
  const { id } = useParams();
  const subjectId = Number(id);
  const navigate = useNavigate();
  const { notify } = useToast();
  const { periods } = usePeriods();
  const { details, loading, error, reload } = useSubjectDetails(Number.isFinite(subjectId) ? subjectId : null);
  const { items: professors } = useEntityList(professorsApi);

  usePageTitle(details?.name ?? "Matéria");

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [workload, setWorkload] = useState("");
  const [professorId, setProfessorId] = useState("");

  useEffect(() => {
    if (details) {
      setName(details.name);
      setCode(details.code ?? "");
      setWorkload(String(details.workload));
      setProfessorId(String(details.professorId));
    }
  }, [details]);

  const average = details ? subjectAverage(details.assignments, details.exams) : null;
  const displayedAverage = useAnimatedNumber(average);

  if (loading) {
    return <SkeletonRows rows={6} />;
  }

  if (error) {
    return (
      <EmptyState
        icon={SearchX}
        title="Não foi possível carregar esta matéria"
        description={error}
        action={
          <Button variant="secondary" onClick={reload}>
            Tentar novamente
          </Button>
        }
      />
    );
  }

  if (!details) {
    return <EmptyState icon={SearchX} title="Matéria não encontrada" />;
  }

  const period = periods.find((p) => p.id === details.periodId);
  const professor = professors.find((p) => p.id === details.professorId);

  const saveSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await subjectsApi.update(subjectId, {
        name,
        code: code || null,
        workload: Number(workload),
        periodId: details.periodId,
        professorId: Number(professorId),
      });
      notify("Matéria atualizada", "success");
      setEditing(false);
      reload();
    } catch (err) {
      notify(err instanceof ApiError ? err.message : "Erro ao atualizar matéria", "error");
    }
  };

  const deleteSubject = async () => {
    try {
      await subjectsApi.remove(subjectId);
      notify("Matéria removida", "success");
      navigate("/materias");
    } catch (err) {
      notify(err instanceof ApiError ? err.message : "Erro ao remover matéria", "error");
    }
  };

  return (
    <div>
      <Link to="/materias" className="link-with-icon back-link">
        <ChevronLeft size={15} strokeWidth={2} /> Matérias
      </Link>

      {editing ? (
        <form className="inline-form" onSubmit={saveSubject}>
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
            <select className="field__input" value={professorId} onChange={(e) => setProfessorId(e.target.value)} required>
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
          <Button type="button" variant="ghost" icon={X} onClick={() => setEditing(false)}>
            Cancelar
          </Button>
        </form>
      ) : (
        <div className="subject-hub-header">
          <div>
            <h2 className="subject-hub-header__name">
              {details.code && <span className="subject-card__code">{details.code}</span>}
              {details.name}
            </h2>
            <p className="subject-hub-header__meta">
              {professor?.name ?? "sem professor"} · {details.workload}h · {period?.label ?? "—"}
            </p>
          </div>
          <div className="subject-hub-header__average">
            <span className="subject-hub-header__average-label">Média</span>
            <span className="subject-hub-header__average-value" data-empty={average === null}>
              {formatGrade(displayedAverage)}
            </span>
          </div>
          <div className="subject-hub-header__actions">
            <Button variant="ghost" icon={Pencil} onClick={() => setEditing(true)}>
              Editar
            </Button>
            <ConfirmDelete onConfirm={deleteSubject} label="Remover matéria" />
          </div>
        </div>
      )}

      <AttendanceSection
        subjectId={subjectId}
        workload={details.workload}
        absences={details.absences}
        onChange={reload}
      />

      <ScheduleSection subjectId={subjectId} schedules={details.schedules} onChange={reload} />

      <SyllabusSection subjectId={subjectId} entries={details.syllabusEntries} onChange={reload} />

      <SyllabusPlanningSection topics={details.topics} assessments={details.assessments} entries={details.syllabusEntries} />

      <EvaluationSection
        kind="assignment"
        items={details.assignments.map((a) => ({ id: a.id, title: a.title, date: a.dueDate, weight: a.weight, grade: a.grade }))}
        onCreate={async ({ title, date, weight }) => {
          try {
            await assignmentsApi.create({ subjectId, title, dueDate: date, weight, grade: null });
            notify("Atividade adicionada", "success");
            reload();
          } catch (err) {
            notify(err instanceof ApiError ? err.message : "Erro ao adicionar atividade", "error");
          }
        }}
        onUpdateGrade={async (itemId, grade) => {
          const item = details.assignments.find((a) => a.id === itemId);
          if (!item) return;
          try {
            await assignmentsApi.update(itemId, {
              subjectId,
              title: item.title,
              dueDate: item.dueDate,
              weight: item.weight,
              grade,
            });
            notify("Nota atualizada", "success");
            reload();
          } catch (err) {
            notify(err instanceof ApiError ? err.message : "Erro ao atualizar nota", "error");
          }
        }}
        onDelete={async (itemId) => {
          try {
            await assignmentsApi.remove(itemId);
            notify("Atividade removida", "success");
            reload();
          } catch (err) {
            notify(err instanceof ApiError ? err.message : "Erro ao remover atividade", "error");
          }
        }}
      />

      <EvaluationSection
        kind="exam"
        items={details.exams.map((e) => ({ id: e.id, title: e.title, date: e.date, weight: e.weight, grade: e.grade }))}
        onCreate={async ({ title, date, weight }) => {
          try {
            await examsApi.create({ subjectId, title, date, weight, grade: null });
            notify("Prova adicionada", "success");
            reload();
          } catch (err) {
            notify(err instanceof ApiError ? err.message : "Erro ao adicionar prova", "error");
          }
        }}
        onUpdateGrade={async (itemId, grade) => {
          const item = details.exams.find((e) => e.id === itemId);
          if (!item) return;
          try {
            await examsApi.update(itemId, {
              subjectId,
              title: item.title,
              date: item.date,
              weight: item.weight,
              grade,
            });
            notify("Nota atualizada", "success");
            reload();
          } catch (err) {
            notify(err instanceof ApiError ? err.message : "Erro ao atualizar nota", "error");
          }
        }}
        onDelete={async (itemId) => {
          try {
            await examsApi.remove(itemId);
            notify("Prova removida", "success");
            reload();
          } catch (err) {
            notify(err instanceof ApiError ? err.message : "Erro ao remover prova", "error");
          }
        }}
      />
    </div>
  );
}
