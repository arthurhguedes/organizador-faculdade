import { Router } from "express";
import { db } from "../db/index.js";
import * as schema from "../db/schema.js";
import { and, eq } from "drizzle-orm";
import { parseId } from "../lib/http.js";
import { parseBody, requiredDate, requiredText, z } from "../lib/validate.js";

const router = Router();

const dailyNoteSchema = z.object({
  date: requiredDate("date"),
  content: requiredText("content"),
  done: z.boolean().nullish().transform((value) => Boolean(value)),
});

router.get("/", async (req, res) => {
  try {
    const notes = await db.select().from(schema.dailyNotes).where(eq(schema.dailyNotes.userId, req.userId!));
    res.json(notes);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao buscar anotações" });
  }
});

router.post("/", async (req, res) => {
  const body = parseBody(dailyNoteSchema, req.body, res);
  if (!body) return;
  const { date, content, done } = body;

  try {
    const newNote = await db.insert(schema.dailyNotes).values({
      date,
      content,
      done,
      userId: req.userId!,
    }).returning();
    res.json(newNote);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao criar anotação" });
  }
});

router.put("/:id", async (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) {
    return res.status(400).json({ message: "id inválido" });
  }

  const body = parseBody(dailyNoteSchema, req.body, res);
  if (!body) return;
  const { date, content, done } = body;

  try {
    const updated = await db
      .update(schema.dailyNotes)
      .set({ date, content, done })
      .where(and(eq(schema.dailyNotes.id, id), eq(schema.dailyNotes.userId, req.userId!)))
      .returning();

    if (updated.length === 0) {
      return res.status(404).json({ message: "Anotação não encontrada" });
    }
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao atualizar anotação" });
  }
});

router.delete("/:id", async (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) {
    return res.status(400).json({ message: "id inválido" });
  }

  try {
    const deleted = await db
      .delete(schema.dailyNotes)
      .where(and(eq(schema.dailyNotes.id, id), eq(schema.dailyNotes.userId, req.userId!)))
      .returning();
    if (deleted.length === 0) {
      return res.status(404).json({ message: "Anotação não encontrada" });
    }
    res.json({ message: "Anotação removida com sucesso" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao remover anotação" });
  }
});

export default router;
