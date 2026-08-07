import { Router } from "express";
import { db } from "../db/index.js";
import * as schema from "../db/schema.js";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const schedules = await db.select().from(schema.schedules);
    res.json(schedules);
  } catch (err) {
    res.status(500).json({ message: "Erro ao buscar horários" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [schedule] = await db.select().from(schema.schedules).where(eq(schema.schedules.id, id));
    if (!schedule) {
      return res.status(404).json({ message: "Horário não encontrado" });
    }
    res.json(schedule);
  } catch (err) {
    res.status(500).json({ message: "Erro ao buscar horário" });
  }
});

router.post("/", async (req, res) => {
  const { subjectId, weekday, startTime, endTime } = req.body;
  if (!subjectId || !weekday || !startTime || !endTime) {
    return res.status(400).json({ message: "subjectId, weekday, startTime e endTime são obrigatórios" });
  }

  try {
    const newSchedule = await db.insert(schema.schedules).values({
      subjectId,
      weekday,
      startTime,
      endTime,
    }).returning();
    res.json(newSchedule);
  } catch (err) {
    res.status(500).json({ message: "Erro ao criar horário" });
  }
});

router.put("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { subjectId, weekday, startTime, endTime } = req.body;
  if (!subjectId || !weekday || !startTime || !endTime) {
    return res.status(400).json({ message: "subjectId, weekday, startTime e endTime são obrigatórios" });
  }

  try {
    const updated = await db.update(schema.schedules).set({
      subjectId,
      weekday,
      startTime,
      endTime,
    }).where(eq(schema.schedules.id, id)).returning();

    if (updated.length === 0) {
      return res.status(404).json({ message: "Horário não encontrado" });
    }
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: "Erro ao atualizar horário" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const deleted = await db.delete(schema.schedules).where(eq(schema.schedules.id, id)).returning();
    if (deleted.length === 0) {
      return res.status(404).json({ message: "Horário não encontrado" });
    }
    res.json({ message: "Horário removido com sucesso" });
  } catch (err) {
    res.status(500).json({ message: "Erro ao remover horário" });
  }
});

export default router;
