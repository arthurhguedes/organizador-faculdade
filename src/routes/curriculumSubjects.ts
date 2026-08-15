import { Router } from "express";
import { db } from "../db/index.js";
import * as schema from "../db/schema.js";
import { and, eq } from "drizzle-orm";
import { parseId } from "../lib/http.js";

const router = Router();

const VALID_STATUSES = ["pendente", "cursando", "concluida"];

router.get("/", async (req, res) => {
  try {
    const items = await db
      .select()
      .from(schema.curriculumSubjects)
      .where(eq(schema.curriculumSubjects.userId, req.userId!));
    res.json(items);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao buscar matriz curricular" });
  }
});

router.get("/:id", async (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) {
    return res.status(400).json({ message: "id inválido" });
  }

  try {
    const [item] = await db
      .select()
      .from(schema.curriculumSubjects)
      .where(and(eq(schema.curriculumSubjects.id, id), eq(schema.curriculumSubjects.userId, req.userId!)));
    if (!item) {
      return res.status(404).json({ message: "Matéria da matriz não encontrada" });
    }
    res.json(item);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao buscar matéria da matriz" });
  }
});

router.post("/", async (req, res) => {
  const { name, code, workload, suggestedPeriod, status } = req.body ?? {};
  if (!name || workload === undefined || workload === null) {
    return res.status(400).json({ message: "name e workload são obrigatórios" });
  }
  if (status !== undefined && !VALID_STATUSES.includes(status)) {
    return res.status(400).json({ message: `status deve ser um de: ${VALID_STATUSES.join(", ")}` });
  }

  try {
    const newItem = await db.insert(schema.curriculumSubjects).values({
      name,
      code: code || null,
      workload,
      suggestedPeriod: suggestedPeriod || null,
      status: status || "pendente",
      userId: req.userId!,
    }).returning();
    res.json(newItem);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao criar matéria da matriz" });
  }
});

router.put("/:id", async (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) {
    return res.status(400).json({ message: "id inválido" });
  }

  const { name, code, workload, suggestedPeriod, status } = req.body ?? {};
  if (!name || workload === undefined || workload === null) {
    return res.status(400).json({ message: "name e workload são obrigatórios" });
  }
  if (status !== undefined && !VALID_STATUSES.includes(status)) {
    return res.status(400).json({ message: `status deve ser um de: ${VALID_STATUSES.join(", ")}` });
  }

  try {
    const updated = await db
      .update(schema.curriculumSubjects)
      .set({ name, code: code || null, workload, suggestedPeriod: suggestedPeriod || null, status: status || "pendente" })
      .where(and(eq(schema.curriculumSubjects.id, id), eq(schema.curriculumSubjects.userId, req.userId!)))
      .returning();

    if (updated.length === 0) {
      return res.status(404).json({ message: "Matéria da matriz não encontrada" });
    }
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao atualizar matéria da matriz" });
  }
});

router.delete("/:id", async (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) {
    return res.status(400).json({ message: "id inválido" });
  }

  try {
    const deleted = await db
      .delete(schema.curriculumSubjects)
      .where(and(eq(schema.curriculumSubjects.id, id), eq(schema.curriculumSubjects.userId, req.userId!)))
      .returning();

    if (deleted.length === 0) {
      return res.status(404).json({ message: "Matéria da matriz não encontrada" });
    }
    res.json({ message: "Matéria da matriz removida com sucesso" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao remover matéria da matriz" });
  }
});

export default router;
