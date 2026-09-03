import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { ChevronLeft, Pencil, X } from "lucide-react";
import { usePageTitle } from "../context/PageTitleContext";
import { usePeriods } from "../context/PeriodContext";
import { useToast } from "../context/ToastContext";
import { useSubjectDetails } from "../hooks/useSubjectDetails";
import { useEntityList } from "../hooks/useEntityList";
import { useAnimatedNumber } from "../hooks/useAnimatedNumber";
import { assignmentsApi, examsApi, subjectsApi, professorsApi, syllabusAssessmentsApi, ApiError } from "../api/client";
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
  const { details, loading, error, reload, patch } = useSubjectDetails(Number.isFinite(subjectId) ? subjectId : null);
  const { items: professors } = useEntityList(professorsApi);

  usePageTitle(details?.name ?? "Matéria");

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [workload, setWorkload] = useState("");
  const [professorId, setProfessorId] = useState("");
  const [savingSubject, setSavingSubject] = useState(false);

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
    if (savingSubject) return;
    setSavingSubject(true);
    try {
      const [updated] = await subjectsApi.update(subjectId, {
        name,
        code: code || null,
        workload: Number(workload),
        periodId: details.periodId,
        professorId: Number(professorId),
      });
      patch((prev) => ({ ...prev, ...updated }));
      notify("Matéria atualizada", "success");
      setEditing(false);
    } catch (err) {
      notify(err instanceof ApiError ? err.message : "Erro ao atualizar matéria", "error");
    } finally {
      setSavingSubject(false);
    }
  };

  const deleteSubject = async () => {
    try {
      await subjectsApi.remove(subjectId);
      notify("Matéria removida", "success");
      navigate("/periodos?tab=materias");
    } catch (err) {
      notify(err instanceof ApiError ? err.message : "Erro ao remover matéria", "error");
    }
  };

  return (
    <div>
      <Link to="/periodos?tab=materias" className="link-with-icon back-link">
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
          <Button type="submit" variant="primary" loading={savingSubject}>
            Salvar
          </Button>
          <Button type="button" variant="ghost" icon={X} onClick={() => setEditing(false)} disabled={savingSubject}>
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
        onSaved={(next) => patch((prev) => ({ ...prev, absences: next }))}
      />

      <ScheduleSection
        subjectId={subjectId}
        schedules={details.schedules}
        onCreated={(schedule) => patch((prev) => ({ ...prev, schedules: [...prev.schedules, schedule] }))}
        onDeleted={(id) => patch((prev) => ({ ...prev, schedules: prev.schedules.filter((s) => s.id !== id) }))}
      />

      <SyllabusSection
        subjectId={subjectId}
        entries={details.syllabusEntries}
        onChange={reload}
        periodStartYear={period ? Number(period.startDate.slice(0, 4)) : null}
      />

      <SyllabusPlanningSection
        topics={details.topics}
        assessments={details.assessments}
        entries={details.syllabusEntries}
        onUpdateAssessment={async (assessmentId, field, value) => {
          try {
            const { assessment, message } = await syllabusAssessmentsApi.update(assessmentId, { [field]: value });
            patch((prev) => ({
              ...prev,
              assessments: prev.assessments.map((a) => (a.id === assessmentId ? assessment : a)),
            }));
            notify(message, "success");
          } catch (err) {
            notify(err instanceof ApiError ? err.message : "Erro ao atualizar avaliação", "error");
          }
        }}
      />

      <EvaluationSection
        kind="assignment"
        items={details.assignments.map((a) => ({ id: a.id, title: a.title, date: a.dueDate, weight: a.weight, grade: a.grade }))}
        onCreate={async ({ title, date, weight }) => {
          try {
            const [created] = await assignmentsApi.create({ subjectId, title, dueDate: date, weight, grade: null });
            patch((prev) => ({ ...prev, assignments: [...prev.assignments, created] }));
            notify("Atividade adicionada", "success");
          } catch (err) {
            notify(err instanceof ApiError ? err.message : "Erro ao adicionar atividade", "error");
          }
        }}
        onUpdateGrade={async (itemId, grade) => {
          const item = details.assignments.find((a) => a.id === itemId);
          if (!item) return;
          // Otimista: risca a nota na hora, sem esperar o PUT — só desfaz se falhar.
          const previous = item;
          patch((prev) => ({
            ...prev,
            assignments: prev.assignments.map((a) => (a.id === itemId ? { ...a, grade } : a)),
          }));
          try {
            const [updated] = await assignmentsApi.update(itemId, {
              subjectId,
              title: item.title,
              dueDate: item.dueDate,
              weight: item.weight,
              grade,
            });
            patch((prev) => ({
              ...prev,
              assignments: prev.assignments.map((a) => (a.id === itemId ? updated : a)),
            }));
            notify("Nota atualizada", "success");
          } catch (err) {
            patch((prev) => ({
              ...prev,
              assignments: prev.assignments.map((a) => (a.id === itemId ? previous : a)),
            }));
            notify(err instanceof ApiError ? err.message : "Erro ao atualizar nota", "error");
          }
        }}
        onDelete={async (itemId) => {
          try {
            await assignmentsApi.remove(itemId);
            patch((prev) => ({ ...prev, assignments: prev.assignments.filter((a) => a.id !== itemId) }));
            notify("Atividade removida", "success");
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
            const [created] = await examsApi.create({ subjectId, title, date, weight, grade: null });
            patch((prev) => ({ ...prev, exams: [...prev.exams, created] }));
            notify("Prova adicionada", "success");
          } catch (err) {
            notify(err instanceof ApiError ? err.message : "Erro ao adicionar prova", "error");
          }
        }}
        onUpdateGrade={async (itemId, grade) => {
          const item = details.exams.find((e) => e.id === itemId);
          if (!item) return;
          const previous = item;
          patch((prev) => ({
            ...prev,
            exams: prev.exams.map((e) => (e.id === itemId ? { ...e, grade } : e)),
          }));
          try {
            const [updated] = await examsApi.update(itemId, {
              subjectId,
              title: item.title,
              date: item.date,
              weight: item.weight,
              grade,
            });
            patch((prev) => ({
              ...prev,
              exams: prev.exams.map((e) => (e.id === itemId ? updated : e)),
            }));
            notify("Nota atualizada", "success");
          } catch (err) {
            patch((prev) => ({
              ...prev,
              exams: prev.exams.map((e) => (e.id === itemId ? previous : e)),
            }));
            notify(err instanceof ApiError ? err.message : "Erro ao atualizar nota", "error");
          }
        }}
        onDelete={async (itemId) => {
          try {
            await examsApi.remove(itemId);
            patch((prev) => ({ ...prev, exams: prev.exams.filter((e) => e.id !== itemId) }));
            notify("Prova removida", "success");
          } catch (err) {
            notify(err instanceof ApiError ? err.message : "Erro ao remover prova", "error");
          }
        }}
      />
    </div>
  );
}
