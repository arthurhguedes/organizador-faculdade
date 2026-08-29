import { Router } from "express";
import { db } from "../db/index.js";
import * as schema from "../db/schema.js";
import { and, eq } from "drizzle-orm";
import { parseId, isForeignKeyViolation } from "../lib/http.js";
import { parseBody, requiredDate, requiredId, requiredNumber, requiredText, optionalNumber, z } from "../lib/validate.js";

const router = Router();

const assignmentSchema = z.object({
  subjectId: requiredId("subjectId"),
  title: requiredText("title"),
  dueDate: requiredDate("dueDate"),
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
    const assignments = await db.select().from(schema.assignments).where(eq(schema.assignments.userId, req.userId!));
    res.json(assignments);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao buscar atividades" });
  }
});

router.get("/:id", async (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) {
    return res.status(400).json({ message: "id inválido" });
  }

  try {
    const [assignment] = await db
      .select()
      .from(schema.assignments)
      .where(and(eq(schema.assignments.id, id), eq(schema.assignments.userId, req.userId!)));
    if (!assignment) {
      return res.status(404).json({ message: "Atividade não encontrada" });
    }
    res.json(assignment);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao buscar atividade" });
  }
});

router.post("/", async (req, res) => {
  const body = parseBody(assignmentSchema, req.body, res);
  if (!body) return;
  const { subjectId, title, dueDate, weight, grade } = body;

  try {
    if (!(await ownsSubject(req.userId!, subjectId))) {
      return res.status(400).json({ message: "subjectId não existe" });
    }

    const newAssignment = await db.insert(schema.assignments).values({
      subjectId,
      title,
      dueDate,
      weight,
      grade,
      userId: req.userId!,
    }).returning();
    res.json(newAssignment);
  } catch (err) {
    console.error(err);
    if (isForeignKeyViolation(err)) {
      return res.status(400).json({ message: "subjectId não existe" });
    }
    res.status(500).json({ message: "Erro ao criar atividade" });
  }
});

router.put("/:id", async (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) {
    return res.status(400).json({ message: "id inválido" });
  }

  const body = parseBody(assignmentSchema, req.body, res);
  if (!body) return;
  const { subjectId, title, dueDate, weight, grade } = body;

  try {
    if (!(await ownsSubject(req.userId!, subjectId))) {
      return res.status(400).json({ message: "subjectId não existe" });
    }

    const updated = await db
      .update(schema.assignments)
      .set({ subjectId, title, dueDate, weight, grade })
      .where(and(eq(schema.assignments.id, id), eq(schema.assignments.userId, req.userId!)))
      .returning();

    if (updated.length === 0) {
      return res.status(404).json({ message: "Atividade não encontrada" });
    }
    res.json(updated);
  } catch (err) {
    console.error(err);
    if (isForeignKeyViolation(err)) {
      return res.status(400).json({ message: "subjectId não existe" });
    }
    res.status(500).json({ message: "Erro ao atualizar atividade" });
  }
});

router.delete("/:id", async (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) {
    return res.status(400).json({ message: "id inválido" });
  }

  try {
    const deleted = await db
      .delete(schema.assignments)
      .where(and(eq(schema.assignments.id, id), eq(schema.assignments.userId, req.userId!)))
      .returning();
    if (deleted.length === 0) {
      return res.status(404).json({ message: "Atividade não encontrada" });
    }
    res.json({ message: "Atividade removida com sucesso" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao remover atividade" });
  }
});

export default router;
