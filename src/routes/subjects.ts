import { Router } from "express";
import { db } from "../db/index.js";
import * as schema from "../db/schema.js";
import { and, eq } from "drizzle-orm";
import { parseId, isForeignKeyViolation } from "../lib/http.js";
import { clearSubjectDependencies } from "../lib/cascade.js";

const router = Router();

async function ownsPeriodAndProfessor(userId: number, periodId: number, professorId: number): Promise<boolean> {
  const [period] = await db
    .select({ id: schema.periods.id })
    .from(schema.periods)
    .where(and(eq(schema.periods.id, periodId), eq(schema.periods.userId, userId)));
  const [professor] = await db
    .select({ id: schema.professors.id })
    .from(schema.professors)
    .where(and(eq(schema.professors.id, professorId), eq(schema.professors.userId, userId)));
  return Boolean(period) && Boolean(professor);
}

function groupBySubject<T extends { subjectId: number }>(rows: T[]): Map<number, T[]> {
  const grouped = new Map<number, T[]>();
  for (const row of rows) {
    const list = grouped.get(row.subjectId);
    if (list) {
      list.push(row);
    } else {
      grouped.set(row.subjectId, [row]);
    }
  }
  return grouped;
}

router.get("/", async (req, res) => {
  try {
    const subjects = await db.select().from(schema.subjects).where(eq(schema.subjects.userId, req.userId!));
    res.json(subjects);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao buscar matérias" });
  }
});

// Detalhes de todas as matérias de uma vez. O Dashboard, o Calendário, o sino
// de notificações e a exportação precisam dos filhos de várias matérias ao
// mesmo tempo e faziam um GET por matéria (N+1: abrir o Dashboard com 6
// matérias eram ~7 requisições, e o sino, que fica no TopBar, repetia tudo em
// toda página). Aqui são 7 queries fixas — uma por tabela, filtrada só por
// `user_id` —, independentemente de quantas matérias o usuário tem; o
// agrupamento por matéria é feito em memória.
//
// Precisa vir declarada antes de `GET /:id`: o Express casa na ordem, e
// "/details" bateria naquela rota com `id = "details"`.
router.get("/details", async (req, res) => {
  try {
    const userId = req.userId!;
    const [subjects, schedules, assignments, exams, syllabusEntries, topics, assessments] = await Promise.all([
      db.select().from(schema.subjects).where(eq(schema.subjects.userId, userId)),
      db.select().from(schema.schedules).where(eq(schema.schedules.userId, userId)),
      db.select().from(schema.assignments).where(eq(schema.assignments.userId, userId)),
      db.select().from(schema.exams).where(eq(schema.exams.userId, userId)),
      db.select().from(schema.syllabusEntries).where(eq(schema.syllabusEntries.userId, userId)),
      db.select().from(schema.syllabusTopics).where(eq(schema.syllabusTopics.userId, userId)),
      db.select().from(schema.syllabusAssessments).where(eq(schema.syllabusAssessments.userId, userId)),
    ]);

    const schedulesBySubject = groupBySubject(schedules);
    const assignmentsBySubject = groupBySubject(assignments);
    const examsBySubject = groupBySubject(exams);
    const syllabusBySubject = groupBySubject(syllabusEntries);
    const topicsBySubject = groupBySubject(topics);
    const assessmentsBySubject = groupBySubject(assessments);

    res.json(
      subjects.map((subject) => ({
        ...subject,
        schedules: schedulesBySubject.get(subject.id) ?? [],
        assignments: assignmentsBySubject.get(subject.id) ?? [],
        exams: examsBySubject.get(subject.id) ?? [],
        syllabusEntries: syllabusBySubject.get(subject.id) ?? [],
        topics: topicsBySubject.get(subject.id) ?? [],
        assessments: assessmentsBySubject.get(subject.id) ?? [],
      })),
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao buscar detalhes das matérias" });
  }
});

router.get("/:id", async (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) {
    return res.status(400).json({ message: "id inválido" });
  }

  try {
    const [subject] = await db
      .select()
      .from(schema.subjects)
      .where(and(eq(schema.subjects.id, id), eq(schema.subjects.userId, req.userId!)));
    if (!subject) {
      return res.status(404).json({ message: "Matéria não encontrada" });
    }
    res.json(subject);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao buscar matéria" });
  }
});

router.get("/:id/details", async (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) {
    return res.status(400).json({ message: "id inválido" });
  }

  try {
    const [subject] = await db
      .select()
      .from(schema.subjects)
      .where(and(eq(schema.subjects.id, id), eq(schema.subjects.userId, req.userId!)));
    if (!subject) {
      return res.status(404).json({ message: "Matéria não encontrada" });
    }

    // Em paralelo, não em série: são 6 consultas independentes, e cada `await`
    // sequencial era mais uma ida-e-volta até o Neon somada no tempo de
    // resposta desta rota.
    const [subjectSchedules, subjectAssignments, subjectExams, subjectSyllabus, subjectTopics, subjectAssessments] =
      await Promise.all([
        db
          .select()
          .from(schema.schedules)
          .where(and(eq(schema.schedules.subjectId, id), eq(schema.schedules.userId, req.userId!))),
        db
          .select()
          .from(schema.assignments)
          .where(and(eq(schema.assignments.subjectId, id), eq(schema.assignments.userId, req.userId!))),
        db
          .select()
          .from(schema.exams)
          .where(and(eq(schema.exams.subjectId, id), eq(schema.exams.userId, req.userId!))),
        db
          .select()
          .from(schema.syllabusEntries)
          .where(and(eq(schema.syllabusEntries.subjectId, id), eq(schema.syllabusEntries.userId, req.userId!))),
        db
          .select()
          .from(schema.syllabusTopics)
          .where(and(eq(schema.syllabusTopics.subjectId, id), eq(schema.syllabusTopics.userId, req.userId!))),
        db
          .select()
          .from(schema.syllabusAssessments)
          .where(and(eq(schema.syllabusAssessments.subjectId, id), eq(schema.syllabusAssessments.userId, req.userId!))),
      ]);

    res.json({
      ...subject,
      schedules: subjectSchedules,
      assignments: subjectAssignments,
      exams: subjectExams,
      syllabusEntries: subjectSyllabus,
      topics: subjectTopics,
      assessments: subjectAssessments,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao buscar detalhes da matéria" });
  }
});

router.post("/", async (req, res) => {
  const { name, code, workload, periodId, professorId } = req.body ?? {};
  if (!name || workload === undefined || workload === null || !periodId || !professorId) {
    return res.status(400).json({ message: "name, workload, periodId e professorId são obrigatórios" });
  }

  try {
    if (!(await ownsPeriodAndProfessor(req.userId!, periodId, professorId))) {
      return res.status(400).json({ message: "periodId ou professorId não existe" });
    }

    const newSubject = await db.insert(schema.subjects).values({
      name,
      code: code || null,
      workload,
      periodId,
      professorId,
      userId: req.userId!,
    }).returning();
    res.json(newSubject);
  } catch (err) {
    console.error(err);
    if (isForeignKeyViolation(err)) {
      return res.status(400).json({ message: "periodId ou professorId não existe" });
    }
    res.status(500).json({ message: "Erro ao criar matéria" });
  }
});

router.put("/:id", async (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) {
    return res.status(400).json({ message: "id inválido" });
  }

  const { name, code, workload, periodId, professorId } = req.body ?? {};
  if (!name || workload === undefined || workload === null || !periodId || !professorId) {
    return res.status(400).json({ message: "name, workload, periodId e professorId são obrigatórios" });
  }

  try {
    if (!(await ownsPeriodAndProfessor(req.userId!, periodId, professorId))) {
      return res.status(400).json({ message: "periodId ou professorId não existe" });
    }

    const updated = await db
      .update(schema.subjects)
      .set({ name, code: code || null, workload, periodId, professorId })
      .where(and(eq(schema.subjects.id, id), eq(schema.subjects.userId, req.userId!)))
      .returning();

    if (updated.length === 0) {
      return res.status(404).json({ message: "Matéria não encontrada" });
    }
    res.json(updated);
  } catch (err) {
    console.error(err);
    if (isForeignKeyViolation(err)) {
      return res.status(400).json({ message: "periodId ou professorId não existe" });
    }
    res.status(500).json({ message: "Erro ao atualizar matéria" });
  }
});

router.patch("/:id/absences", async (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) {
    return res.status(400).json({ message: "id inválido" });
  }

  const { absences } = req.body ?? {};
  if (typeof absences !== "number" || !Number.isInteger(absences) || absences < 0) {
    return res.status(400).json({ message: "absences deve ser um inteiro >= 0" });
  }

  try {
    const updated = await db
      .update(schema.subjects)
      .set({ absences })
      .where(and(eq(schema.subjects.id, id), eq(schema.subjects.userId, req.userId!)))
      .returning();

    if (updated.length === 0) {
      return res.status(404).json({ message: "Matéria não encontrada" });
    }
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao atualizar faltas" });
  }
});

router.delete("/:id", async (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) {
    return res.status(400).json({ message: "id inválido" });
  }

  try {
    const deleted = await db.transaction(async (tx) => {
      const userId = req.userId!;
      await clearSubjectDependencies(tx, userId, [id]);
      return tx
        .delete(schema.subjects)
        .where(and(eq(schema.subjects.id, id), eq(schema.subjects.userId, userId)))
        .returning();
    });

    if (deleted.length === 0) {
      return res.status(404).json({ message: "Matéria não encontrada" });
    }
    res.json({ message: "Matéria removida com sucesso" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao remover matéria" });
  }
});

export default router;
