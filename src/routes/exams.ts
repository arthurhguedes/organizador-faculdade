import { Router } from "express";
import { db } from "../db/index.js";
import * as schema from "../db/schema.js";
import { and, eq } from "drizzle-orm";
import { parseId, isForeignKeyViolation } from "../lib/http.js";
import { parseBody, requiredDate, requiredId, requiredNumber, requiredText, optionalNumber, z } from "../lib/validate.js";

const router = Router();

const examSchema = z.object({
  subjectId: requiredId("subjectId"),
  title: requiredText("title"),
  date: requiredDate("date"),
  weight: requiredNumber("weight"),
  grade: optionalNumber("grade"),
});

async function ownsSubject(userId: number, subjectId: number): Promise<boolean> {
  const [subject] = await db
    .select({ id: schema.subjects.id })
    .from(schema.subjects)
    .where(and(eq(schema.subjects.id, subjectId), eq(schema.subjects.userId, userId)));
  return Boolean(subject);
}

router.get("/", async (req, res) => {
  try {
    const exams = await db.select().from(schema.exams).where(eq(schema.exams.userId, req.userId!));
    res.json(exams);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao buscar provas" });
  }
});

router.get("/:id", async (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) {
    return res.status(400).json({ message: "id inválido" });
  }

  try {
    const [exam] = await db
      .select()
      .from(schema.exams)
      .where(and(eq(schema.exams.id, id), eq(schema.exams.userId, req.userId!)));
    if (!exam) {
      return res.status(404).json({ message: "Prova não encontrada" });
    }
    res.json(exam);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao buscar prova" });
  }
});

router.post("/", async (req, res) => {
  const body = parseBody(examSchema, req.body, res);
  if (!body) return;
  const { subjectId, title, date, weight, grade } = body;

  try {
    if (!(await ownsSubject(req.userId!, subjectId))) {
      return res.status(400).json({ message: "subjectId não existe" });
    }

    const newExam = await db.insert(schema.exams).values({
      subjectId,
      title,
      date,
      weight,
      grade,
      userId: req.userId!,
    }).returning();
    res.json(newExam);
  } catch (err) {
    console.error(err);
    if (isForeignKeyViolation(err)) {
      return res.status(400).json({ message: "subjectId não existe" });
    }
    res.status(500).json({ message: "Erro ao criar prova" });
  }
});

router.put("/:id", async (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) {
    return res.status(400).json({ message: "id inválido" });
  }

  const body = parseBody(examSchema, req.body, res);
  if (!body) return;
  const { subjectId, title, date, weight, grade } = body;

  try {
    if (!(await ownsSubject(req.userId!, subjectId))) {
      return res.status(400).json({ message: "subjectId não existe" });
    }

    const updated = await db
      .update(schema.exams)
      .set({ subjectId, title, date, weight, grade })
      .where(and(eq(schema.exams.id, id), eq(schema.exams.userId, req.userId!)))
      .returning();

    if (updated.length === 0) {
      return res.status(404).json({ message: "Prova não encontrada" });
    }
    res.json(updated);
  } catch (err) {
    console.error(err);
    if (isForeignKeyViolation(err)) {
      return res.status(400).json({ message: "subjectId não existe" });
    }
    res.status(500).json({ message: "Erro ao atualizar prova" });
  }
});

router.delete("/:id", async (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) {
    return res.status(400).json({ message: "id inválido" });
  }

  try {
    const deleted = await db
      .delete(schema.exams)
      .where(and(eq(schema.exams.id, id), eq(schema.exams.userId, req.userId!)))
      .returning();
    if (deleted.length === 0) {
      return res.status(404).json({ message: "Prova não encontrada" });
    }
    res.json({ message: "Prova removida com sucesso" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao remover prova" });
  }
});

export default router;
