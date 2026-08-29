import { Router } from "express";
import { db } from "../db/index.js";
import * as schema from "../db/schema.js";
import { and, eq } from "drizzle-orm";
import { parseId, isForeignKeyViolation } from "../lib/http.js";
import { parseBody, optionalText, requiredId, requiredText, z } from "../lib/validate.js";

const router = Router();

const scheduleSchema = z.object({
  subjectId: requiredId("subjectId"),
  weekday: requiredText("weekday"),
  startTime: requiredText("startTime"),
  endTime: requiredText("endTime"),
  room: optionalText,
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
    const schedules = await db.select().from(schema.schedules).where(eq(schema.schedules.userId, req.userId!));
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
    const [schedule] = await db
      .select()
      .from(schema.schedules)
      .where(and(eq(schema.schedules.id, id), eq(schema.schedules.userId, req.userId!)));
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
  const body = parseBody(scheduleSchema, req.body, res);
  if (!body) return;
  const { subjectId, weekday, startTime, endTime, room } = body;

  try {
    if (!(await ownsSubject(req.userId!, subjectId))) {
      return res.status(400).json({ message: "subjectId não existe" });
    }

    const newSchedule = await db.insert(schema.schedules).values({
      subjectId,
      weekday,
      startTime,
      endTime,
      room,
      userId: req.userId!,
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

  const body = parseBody(scheduleSchema, req.body, res);
  if (!body) return;
  const { subjectId, weekday, startTime, endTime, room } = body;

  try {
    if (!(await ownsSubject(req.userId!, subjectId))) {
      return res.status(400).json({ message: "subjectId não existe" });
    }

    const updated = await db
      .update(schema.schedules)
      .set({ subjectId, weekday, startTime, endTime, room })
      .where(and(eq(schema.schedules.id, id), eq(schema.schedules.userId, req.userId!)))
      .returning();

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
    const deleted = await db
      .delete(schema.schedules)
      .where(and(eq(schema.schedules.id, id), eq(schema.schedules.userId, req.userId!)))
      .returning();
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
