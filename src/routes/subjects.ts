import { Router } from "express";
import { db } from "../db/index.js";
import * as schema from "../db/schema.js";
import { eq } from "drizzle-orm";
import { parseId, isForeignKeyViolation } from "../lib/http.js";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const subjects = await db.select().from(schema.subjects);
    res.json(subjects);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao buscar matérias" });
  }
});

router.get("/:id", async (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) {
    return res.status(400).json({ message: "id inválido" });
  }

  try {
    const [subject] = await db.select().from(schema.subjects).where(eq(schema.subjects.id, id));
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
    const [subject] = await db.select().from(schema.subjects).where(eq(schema.subjects.id, id));
    if (!subject) {
      return res.status(404).json({ message: "Matéria não encontrada" });
    }

    const subjectSchedules = await db.select().from(schema.schedules).where(eq(schema.schedules.subjectId, id));
    const subjectAssignments = await db.select().from(schema.assignments).where(eq(schema.assignments.subjectId, id));
    const subjectExams = await db.select().from(schema.exams).where(eq(schema.exams.subjectId, id));

    res.json({
      ...subject,
      schedules: subjectSchedules,
      assignments: subjectAssignments,
      exams: subjectExams,
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
    const newSubject = await db.insert(schema.subjects).values({
      name,
      code: code || null,
      workload,
      periodId,
      professorId,
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
    const updated = await db.update(schema.subjects).set({
      name,
      code: code || null,
      workload,
      periodId,
      professorId,
    }).where(eq(schema.subjects.id, id)).returning();

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

router.delete("/:id", async (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) {
    return res.status(400).json({ message: "id inválido" });
  }

  try {
    const deleted = await db.delete(schema.subjects).where(eq(schema.subjects.id, id)).returning();
    if (deleted.length === 0) {
      return res.status(404).json({ message: "Matéria não encontrada" });
    }
    res.json({ message: "Matéria removida com sucesso" });
  } catch (err) {
    console.error(err);
    if (isForeignKeyViolation(err)) {
      return res.status(400).json({ message: "Não é possível remover: existem horários, atividades ou provas vinculados a esta matéria" });
    }
    res.status(500).json({ message: "Erro ao remover matéria" });
  }
});

export default router;
