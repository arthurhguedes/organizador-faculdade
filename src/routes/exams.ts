import { Router } from "express";
import { db } from "../db/index.js";
import * as schema from "../db/schema.js";
import { eq } from "drizzle-orm";
import { parseId, isForeignKeyViolation } from "../lib/http.js";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const exams = await db.select().from(schema.exams);
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
    const [exam] = await db.select().from(schema.exams).where(eq(schema.exams.id, id));
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
  const { subjectId, title, date, weight, grade } = req.body ?? {};
  if (!subjectId || !title || !date || weight === undefined || weight === null) {
    return res.status(400).json({ message: "subjectId, title, date e weight são obrigatórios" });
  }

  try {
    const newExam = await db.insert(schema.exams).values({
      subjectId,
      title,
      date,
      weight,
      grade,
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

  const { subjectId, title, date, weight, grade } = req.body ?? {};
  if (!subjectId || !title || !date || weight === undefined || weight === null) {
    return res.status(400).json({ message: "subjectId, title, date e weight são obrigatórios" });
  }

  try {
    const updated = await db.update(schema.exams).set({
      subjectId,
      title,
      date,
      weight,
      grade,
    }).where(eq(schema.exams.id, id)).returning();

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
    const deleted = await db.delete(schema.exams).where(eq(schema.exams.id, id)).returning();
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
