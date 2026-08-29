import { Router } from "express";
import { db } from "../db/index.js";
import * as schema from "../db/schema.js";
import { and, eq } from "drizzle-orm";
import { parseId, isForeignKeyViolation } from "../lib/http.js";
import { parseBody, requiredDate, requiredText, z } from "../lib/validate.js";

const router = Router();

const periodSchema = z.object({
  label: requiredText("label"),
  startDate: requiredDate("startDate"),
  endDate: requiredDate("endDate"),
});

router.get("/", async (req, res) => {
  try {
    const periods = await db.select().from(schema.periods).where(eq(schema.periods.userId, req.userId!));
    res.json(periods);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao buscar períodos" });
  }
});

router.get("/:id", async (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) {
    return res.status(400).json({ message: "id inválido" });
  }

  try {
    const [period] = await db
      .select()
      .from(schema.periods)
      .where(and(eq(schema.periods.id, id), eq(schema.periods.userId, req.userId!)));
    if (!period) {
      return res.status(404).json({ message: "Período não encontrado" });
    }
    res.json(period);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao buscar período" });
  }
});

router.post("/", async (req, res) => {
  const body = parseBody(periodSchema, req.body, res);
  if (!body) return;
  const { label, startDate, endDate } = body;

  try {
    const newPeriod = await db.insert(schema.periods).values({
      label,
      startDate,
      endDate,
      userId: req.userId!,
    }).returning();
    res.json(newPeriod);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao criar período" });
  }
});

router.put("/:id", async (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) {
    return res.status(400).json({ message: "id inválido" });
  }

  const body = parseBody(periodSchema, req.body, res);
  if (!body) return;
  const { label, startDate, endDate } = body;

  try {
    const updated = await db
      .update(schema.periods)
      .set({ label, startDate, endDate })
      .where(and(eq(schema.periods.id, id), eq(schema.periods.userId, req.userId!)))
      .returning();

    if (updated.length === 0) {
      return res.status(404).json({ message: "Período não encontrado" });
    }
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao atualizar período" });
  }
});

router.delete("/:id", async (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) {
    return res.status(400).json({ message: "id inválido" });
  }

  try {
    const deleted = await db
      .delete(schema.periods)
      .where(and(eq(schema.periods.id, id), eq(schema.periods.userId, req.userId!)))
      .returning();
    if (deleted.length === 0) {
      return res.status(404).json({ message: "Período não encontrado" });
    }
    res.json({ message: "Período removido com sucesso" });
  } catch (err) {
    console.error(err);
    if (isForeignKeyViolation(err)) {
      return res.status(400).json({ message: "Não é possível remover: existem matérias vinculadas a este período" });
    }
    res.status(500).json({ message: "Erro ao remover período" });
  }
});

export default router;
