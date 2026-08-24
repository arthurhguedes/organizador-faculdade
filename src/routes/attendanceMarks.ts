import { Router } from "express";
import { db } from "../db/index.js";
import * as schema from "../db/schema.js";
import { and, eq, sql } from "drizzle-orm";
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
    const marks = await db
      .select({
        id: schema.attendanceMarks.id,
        subjectId: schema.attendanceMarks.subjectId,
        scheduleId: schema.attendanceMarks.scheduleId,
        date: schema.attendanceMarks.date,
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
  const { subjectId, date, scheduleId } = req.body ?? {};
  const parsedSubjectId = parseId(String(subjectId));
  if (parsedSubjectId === null) {
    return res.status(400).json({ message: "subjectId é obrigatório" });
  }
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ message: "date deve estar no formato YYYY-MM-DD" });
  }
  const parsedScheduleId = scheduleId == null ? null : parseId(String(scheduleId));
  if (scheduleId != null && parsedScheduleId === null) {
    return res.status(400).json({ message: "scheduleId inválido" });
  }

  try {
    const userId = req.userId!;
    if (!(await ownsSubject(userId, parsedSubjectId))) {
      return res.status(400).json({ message: "subjectId não existe" });
    }

    const result = await db.transaction(async (tx) => {
      const [mark] = await tx
        .insert(schema.attendanceMarks)
        .values({ subjectId: parsedSubjectId, scheduleId: parsedScheduleId, date, userId })
        .returning();
      const [subject] = await tx
        .update(schema.subjects)
        .set({ absences: sql`${schema.subjects.absences} + 1` })
        .where(eq(schema.subjects.id, parsedSubjectId))
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
    res.json({ message: "Falta desmarcada com sucesso", absences: result.absences });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao desmarcar falta" });
  }
});

export default router;
