import { and, eq, inArray } from "drizzle-orm";
import type { db } from "../db/index.js";
import * as schema from "../db/schema.js";

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

// Toda tabela que aponta pra `subjects` precisa ser resolvida antes de apagar
// a matéria: as FKs foram criadas sem ON DELETE, então uma linha órfã em
// qualquer uma delas derrubava o DELETE inteiro em erro de FK (o usuário via
// só um 500 "Erro ao remover matéria" ao tentar excluir uma matéria que já
// tinha plano de ensino importado, sessão de Pomodoro ou requerimento).
//
// Duas categorias diferentes:
//   - filhos da matéria (horários, atividades, provas, plano de ensino,
//     faltas marcadas): só existem por causa dela, então somem junto;
//   - registros com vida própria (sessões de estudo, requerimentos): a coluna
//     `subject_id` é nullable justamente porque valem sem matéria — as horas
//     estudadas e o histórico de requerimentos continuam, só desvinculados.
export async function clearSubjectDependencies(
  tx: Transaction,
  userId: number,
  subjectIds: number[],
): Promise<void> {
  if (subjectIds.length === 0) return;

  await tx
    .delete(schema.attendanceMarks)
    .where(and(inArray(schema.attendanceMarks.subjectId, subjectIds), eq(schema.attendanceMarks.userId, userId)));
  await tx
    .delete(schema.schedules)
    .where(and(inArray(schema.schedules.subjectId, subjectIds), eq(schema.schedules.userId, userId)));
  await tx
    .delete(schema.assignments)
    .where(and(inArray(schema.assignments.subjectId, subjectIds), eq(schema.assignments.userId, userId)));
  await tx
    .delete(schema.exams)
    .where(and(inArray(schema.exams.subjectId, subjectIds), eq(schema.exams.userId, userId)));
  await tx
    .delete(schema.syllabusEntries)
    .where(and(inArray(schema.syllabusEntries.subjectId, subjectIds), eq(schema.syllabusEntries.userId, userId)));
  await tx
    .delete(schema.syllabusTopics)
    .where(and(inArray(schema.syllabusTopics.subjectId, subjectIds), eq(schema.syllabusTopics.userId, userId)));
  await tx
    .delete(schema.syllabusAssessments)
    .where(
      and(inArray(schema.syllabusAssessments.subjectId, subjectIds), eq(schema.syllabusAssessments.userId, userId)),
    );

  await tx
    .update(schema.studySessions)
    .set({ subjectId: null })
    .where(and(inArray(schema.studySessions.subjectId, subjectIds), eq(schema.studySessions.userId, userId)));
  await tx
    .update(schema.academicRequests)
    .set({ subjectId: null })
    .where(and(inArray(schema.academicRequests.subjectId, subjectIds), eq(schema.academicRequests.userId, userId)));
}
