import { Router } from "express";
import { db } from "../db/index.js";
import * as schema from "../db/schema.js";
import { and, eq } from "drizzle-orm";
import { parseId, isForeignKeyViolation } from "../lib/http.js";

const router = Router();

async function ownsSubject(userId: number, subjectId: number): Promise<boolean> {
  const [subject] = await db
    .select({ id: schema.subjects.id })
    .from(schema.subjects)
    .where(and(eq(schema.subjects.id, subjectId), eq(schema.subjects.userId, userId)));
  return Boolean(subject);
}

router.get("/", async (req, res) => {
  try {
    const sessions = await db.select().from(schema.studySessions).where(eq(schema.studySessions.userId, req.userId!));
    res.json(sessions);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao buscar sessões de estudo" });
  }
});

router.post("/", async (req, res) => {
  const { subjectId, topic, date, durationMinutes, source } = req.body ?? {};
  if (!date || !durationMinutes || !source) {
    return res.status(400).json({ message: "date, durationMinutes e source são obrigatórios" });
  }
  if (source !== "pomodoro" && source !== "manual") {
    return res.status(400).json({ message: "source deve ser 'pomodoro' ou 'manual'" });
  }

  try {
    if (subjectId && !(await ownsSubject(req.userId!, subjectId))) {
      return res.status(400).json({ message: "subjectId não existe" });
    }

    const newSession = await db.insert(schema.studySessions).values({
      subjectId: subjectId || null,
      topic: topic || null,
      date,
      durationMinutes,
      source,
      userId: req.userId!,
    }).returning();
    res.json(newSession);
  } catch (err) {
    console.error(err);
    if (isForeignKeyViolation(err)) {
      return res.status(400).json({ message: "subjectId não existe" });
    }
    res.status(500).json({ message: "Erro ao criar sessão de estudo" });
  }
});

router.put("/:id", async (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) {
    return res.status(400).json({ message: "id inválido" });
  }

  const { subjectId, topic, date, durationMinutes, source } = req.body ?? {};
  if (!date || !durationMinutes || !source) {
    return res.status(400).json({ message: "date, durationMinutes e source são obrigatórios" });
  }
  if (source !== "pomodoro" && source !== "manual") {
    return res.status(400).json({ message: "source deve ser 'pomodoro' ou 'manual'" });
  }

  try {
    if (subjectId && !(await ownsSubject(req.userId!, subjectId))) {
      return res.status(400).json({ message: "subjectId não existe" });
    }

    const updated = await db
      .update(schema.studySessions)
      .set({ subjectId: subjectId || null, topic: topic || null, date, durationMinutes, source })
      .where(and(eq(schema.studySessions.id, id), eq(schema.studySessions.userId, req.userId!)))
      .returning();

    if (updated.length === 0) {
      return res.status(404).json({ message: "Sessão de estudo não encontrada" });
    }
    res.json(updated);
  } catch (err) {
    console.error(err);
    if (isForeignKeyViolation(err)) {
      return res.status(400).json({ message: "subjectId não existe" });
    }
    res.status(500).json({ message: "Erro ao atualizar sessão de estudo" });
  }
});

router.delete("/:id", async (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) {
    return res.status(400).json({ message: "id inválido" });
  }

  try {
    const deleted = await db
      .delete(schema.studySessions)
      .where(and(eq(schema.studySessions.id, id), eq(schema.studySessions.userId, req.userId!)))
      .returning();
    if (deleted.length === 0) {
      return res.status(404).json({ message: "Sessão de estudo não encontrada" });
    }
    res.json({ message: "Sessão de estudo removida com sucesso" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao remover sessão de estudo" });
  }
});

export default router;
