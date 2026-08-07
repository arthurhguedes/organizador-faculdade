import { Router } from "express";
import { db } from "../db/index.js";
import * as schema from "../db/schema.js";
import { eq } from "drizzle-orm";
import { parseId, isForeignKeyViolation } from "../lib/http.js";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const schedules = await db.select().from(schema.schedules);
    res.json(schedules);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao buscar horários" });
  }
});

router.get("/:id", async (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) {
    return res.status(400).json({ message: "id inválido" });
  }

  try {
    const [schedule] = await db.select().from(schema.schedules).where(eq(schema.schedules.id, id));
    if (!schedule) {
      return res.status(404).json({ message: "Horário não encontrado" });
    }
    res.json(schedule);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao buscar horário" });
  }
});

router.post("/", async (req, res) => {
  const { subjectId, weekday, startTime, endTime } = req.body ?? {};
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
    console.error(err);
    if (isForeignKeyViolation(err)) {
      return res.status(400).json({ message: "subjectId não existe" });
    }
    res.status(500).json({ message: "Erro ao criar horário" });
  }
});

router.put("/:id", async (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) {
    return res.status(400).json({ message: "id inválido" });
  }

  const { subjectId, weekday, startTime, endTime } = req.body ?? {};
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
    console.error(err);
    if (isForeignKeyViolation(err)) {
      return res.status(400).json({ message: "subjectId não existe" });
    }
    res.status(500).json({ message: "Erro ao atualizar horário" });
  }
});

router.delete("/:id", async (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) {
    return res.status(400).json({ message: "id inválido" });
  }

  try {
    const deleted = await db.delete(schema.schedules).where(eq(schema.schedules.id, id)).returning();
    if (deleted.length === 0) {
      return res.status(404).json({ message: "Horário não encontrado" });
    }
    res.json({ message: "Horário removido com sucesso" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao remover horário" });
  }
});

export default router;
