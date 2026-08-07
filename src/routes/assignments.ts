import { Router } from "express";
import { db } from "../db/index.js";
import * as schema from "../db/schema.js";
import { eq } from "drizzle-orm";
import { parseId, isForeignKeyViolation } from "../lib/http.js";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const assignments = await db.select().from(schema.assignments);
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
    const [assignment] = await db.select().from(schema.assignments).where(eq(schema.assignments.id, id));
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
  const { subjectId, title, dueDate, weight, grade } = req.body ?? {};
  if (!subjectId || !title || !dueDate || weight === undefined || weight === null) {
    return res.status(400).json({ message: "subjectId, title, dueDate e weight são obrigatórios" });
  }

  try {
    const newAssignment = await db.insert(schema.assignments).values({
      subjectId,
      title,
      dueDate,
      weight,
      grade,
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

  const { subjectId, title, dueDate, weight, grade } = req.body ?? {};
  if (!subjectId || !title || !dueDate || weight === undefined || weight === null) {
    return res.status(400).json({ message: "subjectId, title, dueDate e weight são obrigatórios" });
  }

  try {
    const updated = await db.update(schema.assignments).set({
      subjectId,
      title,
      dueDate,
      weight,
      grade,
    }).where(eq(schema.assignments.id, id)).returning();

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
    const deleted = await db.delete(schema.assignments).where(eq(schema.assignments.id, id)).returning();
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
