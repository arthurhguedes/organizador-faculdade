import { Router } from "express";
import { db } from "../db/index.js";
import * as schema from "../db/schema.js";
import { eq } from "drizzle-orm";
import { parseId, isForeignKeyViolation } from "../lib/http.js";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const periods = await db.select().from(schema.periods);
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
    const [period] = await db.select().from(schema.periods).where(eq(schema.periods.id, id));
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
  const { label, startDate, endDate } = req.body ?? {};
  if (!label || !startDate || !endDate) {
    return res.status(400).json({ message: "label, startDate e endDate são obrigatórios" });
  }

  try {
    const newPeriod = await db.insert(schema.periods).values({
      label,
      startDate,
      endDate,
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

  const { label, startDate, endDate } = req.body ?? {};
  if (!label || !startDate || !endDate) {
    return res.status(400).json({ message: "label, startDate e endDate são obrigatórios" });
  }

  try {
    const updated = await db.update(schema.periods).set({
      label,
      startDate,
      endDate,
    }).where(eq(schema.periods.id, id)).returning();

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
    const deleted = await db.delete(schema.periods).where(eq(schema.periods.id, id)).returning();
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
