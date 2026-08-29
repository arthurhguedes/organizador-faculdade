import { Router } from "express";
import { db } from "../db/index.js";
import * as schema from "../db/schema.js";
import { and, eq, sql } from "drizzle-orm";
import { parseId } from "../lib/http.js";
import { choice, optionalId, parseBody, requiredDate, requiredId, z } from "../lib/validate.js";

const router = Router();

const attendanceMarkSchema = z.object({
  subjectId: requiredId("subjectId"),
  date: requiredDate("date"),
  // Nulo quando a ocorrência vem de um plano de ensino aula-a-aula, que já
  // tem uma linha por data — não há qual horário escolher.
  scheduleId: optionalId("scheduleId"),
  kind: choice("kind", ["falta", "sem_aula"]).default("falta"),
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
    const marks = await db
      .select({
        id: schema.attendanceMarks.id,
        subjectId: schema.attendanceMarks.subjectId,
        scheduleId: schema.attendanceMarks.scheduleId,
        date: schema.attendanceMarks.date,
        kind: schema.attendanceMarks.kind,
      })
      .from(schema.attendanceMarks)
      .where(eq(schema.attendanceMarks.userId, req.userId!));
    res.json(marks);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao buscar faltas marcadas" });
  }
});

router.post("/", async (req, res) => {
  const body = parseBody(attendanceMarkSchema, req.body, res);
  if (!body) return;
  const { subjectId, date, scheduleId, kind } = body;

  try {
    const userId = req.userId!;
    if (!(await ownsSubject(userId, subjectId))) {
      return res.status(400).json({ message: "subjectId não existe" });
    }

    const result = await db.transaction(async (tx) => {
      const [mark] = await tx
        .insert(schema.attendanceMarks)
        .values({ subjectId, scheduleId, date, kind, userId })
        .returning();
      if (kind !== "falta") {
        return { mark, absences: null };
      }
      const [subject] = await tx
        .update(schema.subjects)
        .set({ absences: sql`${schema.subjects.absences} + 1` })
        .where(eq(schema.subjects.id, subjectId))
        .returning({ absences: schema.subjects.absences });
      return { mark, absences: subject!.absences };
    });

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao marcar falta" });
  }
});

router.delete("/:id", async (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) {
    return res.status(400).json({ message: "id inválido" });
  }

  try {
    const userId = req.userId!;
    const result = await db.transaction(async (tx) => {
      const [deleted] = await tx
        .delete(schema.attendanceMarks)
        .where(and(eq(schema.attendanceMarks.id, id), eq(schema.attendanceMarks.userId, userId)))
        .returning();
      if (!deleted) return null;
      if (deleted.kind !== "falta") {
        return { absences: null };
      }

      const [subject] = await tx
        .update(schema.subjects)
        .set({ absences: sql`greatest(${schema.subjects.absences} - 1, 0)` })
        .where(eq(schema.subjects.id, deleted.subjectId))
        .returning({ absences: schema.subjects.absences });
      return { absences: subject!.absences };
    });

    if (!result) {
      return res.status(404).json({ message: "Falta marcada não encontrada" });
    }
    res.json({ message: "Marcação removida com sucesso", absences: result.absences });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao remover marcação" });
  }
});

export default router;
