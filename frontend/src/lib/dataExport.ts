import { periodsApi, professorsApi, getAllSubjectDetails } from "../api/client";
import { subjectAverage } from "./grades";

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function toSheet(rows: Record<string, unknown>[], emptyMessage: string) {
  return rows.length > 0 ? rows : [{ Aviso: emptyMessage }];
}

export async function exportAcademicData(): Promise<void> {
  const [periods, professors, details] = await Promise.all([
    periodsApi.list(),
    professorsApi.list(),
    getAllSubjectDetails(),
  ]);

  const periodLabel = (id: number) => periods.find((p) => p.id === id)?.label ?? "";
  const professorName = (id: number) => professors.find((p) => p.id === id)?.name ?? "";

  const subjectsSheet = details.map((s) => ({
    Período: periodLabel(s.periodId),
    Matéria: s.name,
    Código: s.code ?? "",
    Professor: professorName(s.professorId),
    "Carga horária": s.workload,
    Média: subjectAverage(s.assignments, s.exams) ?? "",
  }));

  const schedulesSheet = details.flatMap((s) =>
    s.schedules.map((sch) => ({
      Matéria: s.name,
      Dia: capitalize(sch.weekday),
      Início: sch.startTime,
      Fim: sch.endTime,
    })),
  );

  const assignmentsSheet = details.flatMap((s) =>
    s.assignments.map((a) => ({
      Matéria: s.name,
      Atividade: a.title,
      Prazo: a.dueDate,
      Peso: a.weight,
      Nota: a.grade ?? "",
    })),
  );

  const examsSheet = details.flatMap((s) =>
    s.exams.map((e) => ({
      Matéria: s.name,
      Prova: e.title,
      Data: e.date,
      Peso: e.weight,
      Nota: e.grade ?? "",
    })),
  );

  const XLSX = await import("xlsx");
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(toSheet(subjectsSheet, "Nenhuma matéria cadastrada")),
    "Matérias",
  );
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(toSheet(schedulesSheet, "Nenhum horário cadastrado")),
    "Horários",
  );
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(toSheet(assignmentsSheet, "Nenhuma atividade cadastrada")),
    "Atividades",
  );
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(toSheet(examsSheet, "Nenhuma prova cadastrada")),
    "Provas",
  );

  const today = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(workbook, `notary-${today}.xlsx`);
}
