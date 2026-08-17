import { Router } from "express";
import { db } from "../db/index.js";
import * as schema from "../db/schema.js";
import { and, eq } from "drizzle-orm";
import { parseId } from "../lib/http.js";

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
    const subjectId = req.query.subjectId ? parseId(String(req.query.subjectId)) : null;
    if (req.query.subjectId && subjectId === null) {
      return res.status(400).json({ message: "subjectId inválido" });
    }

    const conditions = [eq(schema.syllabusEntries.userId, req.userId!)];
    if (subjectId !== null) conditions.push(eq(schema.syllabusEntries.subjectId, subjectId));

    const entries = await db.select().from(schema.syllabusEntries).where(and(...conditions));
    res.json(entries);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao buscar plano de ensino" });
  }
});

type ImportEntry = {
  lessonNumber: number;
  kind: string | null;
  date: string;
  content: string;
};

router.post("/import", async (req, res) => {
  const { subjectId, entries } = req.body ?? {};
  const parsedSubjectId = parseId(String(subjectId));

  if (parsedSubjectId === null) {
    return res.status(400).json({ message: "subjectId é obrigatório" });
  }
  if (!Array.isArray(entries) || entries.length === 0) {
    return res.status(400).json({ message: "entries deve ser uma lista não vazia" });
  }
  for (const entry of entries as ImportEntry[]) {
    if (!entry.date || !entry.content || typeof entry.lessonNumber !== "number") {
      return res.status(400).json({ message: "cada aula precisa de lessonNumber, date e content" });
    }
  }

  try {
    const userId = req.userId!;
    if (!(await ownsSubject(userId, parsedSubjectId))) {
      return res.status(400).json({ message: "subjectId não existe" });
    }

    await db.transaction(async (tx) => {
      await tx
        .delete(schema.syllabusEntries)
        .where(and(eq(schema.syllabusEntries.subjectId, parsedSubjectId), eq(schema.syllabusEntries.userId, userId)));

      await tx.insert(schema.syllabusEntries).values(
        (entries as ImportEntry[]).map((entry) => ({
          subjectId: parsedSubjectId,
          lessonNumber: entry.lessonNumber,
          kind: entry.kind,
          date: entry.date,
          content: entry.content,
          userId,
        })),
      );
    });

    res.json({ message: `${entries.length} aula(s) importada(s) com sucesso` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao importar plano de ensino" });
  }
});

router.delete("/:id", async (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) {
    return res.status(400).json({ message: "id inválido" });
  }

  try {
    const deleted = await db
      .delete(schema.syllabusEntries)
      .where(and(eq(schema.syllabusEntries.id, id), eq(schema.syllabusEntries.userId, req.userId!)))
      .returning();
    if (deleted.length === 0) {
      return res.status(404).json({ message: "Aula não encontrada" });
    }
    res.json({ message: "Aula removida com sucesso" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao remover aula" });
  }
});

export default router;
