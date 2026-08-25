import { Router } from "express";
import { db } from "../db/index.js";
import * as schema from "../db/schema.js";
import { and, eq } from "drizzle-orm";
import { parseId } from "../lib/http.js";

const router = Router();

// Ano do período letivo da matéria, usado como fallback quando a data da
// avaliação vem sem ano (ex: "07/10") — planos de ensino são sempre de um
// semestre só, então o ano de início do período serve pra qualquer data nele.
async function getSubjectPeriodStartYear(userId: number, subjectId: number): Promise<number | null> {
  const [row] = await db
    .select({ startDate: schema.periods.startDate })
    .from(schema.subjects)
    .innerJoin(schema.periods, eq(schema.subjects.periodId, schema.periods.id))
    .where(and(eq(schema.subjects.id, subjectId), eq(schema.subjects.userId, userId)));
  return row ? Number(row.startDate.slice(0, 4)) : null;
}

// "07/10", "07/10/2026" -> "2026-10-07". Retorna null pra texto livre sem uma
// data real (ex: "Será definido posteriormente"), que é como o parser
// representa avaliações do tipo Trabalhos/Exame Especial.
function parseAssessmentDate(dateLabel: string | null, fallbackYear: number): string | null {
  if (!dateLabel) return null;
  const match = dateLabel.match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/);
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  if (day < 1 || day > 31 || month < 1 || month > 12) return null;
  let year = match[3] ? Number(match[3]) : fallbackYear;
  if (year < 100) year += 2000;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

// "25%" -> 25. Retorna null quando o peso vem em branco (ex: Exame Especial)
// ou como texto livre sem número puro (ex: "De acordo com a Resolução CEPE
// n° 2.880." — referência a uma resolução, não um peso de verdade; extrair
// dígito solto daí criaria uma prova automática com peso sem sentido). Exige
// que a célula inteira seja só o número, opcionalmente com "%"/"pontos".
function parseAssessmentWeight(weightLabel: string | null): number | null {
  if (!weightLabel) return null;
  const match = weightLabel.trim().match(/^(\d+(?:[.,]\d+)?)\s*(?:%|pontos?)?$/i);
  if (!match) return null;
  const value = Number(match[1]!.replace(",", "."));
  return Number.isFinite(value) ? value : null;
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
  lessonNumber: number | null;
  kind: string | null;
  date: string | null;
  weekNumber: number | null;
  periodLabel: string | null;
  content: string;
};

type ImportTopic = { code: string; title: string; position: number };

type ImportAssessment = {
  title: string;
  weightLabel: string | null;
  dateLabel: string | null;
  coverageLabel: string | null;
  position: number;
};

router.post("/import", async (req, res) => {
  const { subjectId, format, entries, topics, assessments } = req.body ?? {};
  const parsedSubjectId = parseId(String(subjectId));

  if (parsedSubjectId === null) {
    return res.status(400).json({ message: "subjectId é obrigatório" });
  }
  if (format !== "per_aula" && format !== "weekly") {
    return res.status(400).json({ message: 'format deve ser "per_aula" ou "weekly"' });
  }
  if (!Array.isArray(entries) || entries.length === 0) {
    return res.status(400).json({ message: "entries deve ser uma lista não vazia" });
  }
  for (const entry of entries as ImportEntry[]) {
    if (!entry.content) {
      return res.status(400).json({ message: "cada entrada precisa de content" });
    }
    if (format === "per_aula" && (!entry.date || typeof entry.lessonNumber !== "number")) {
      return res.status(400).json({ message: "cada aula precisa de lessonNumber e date" });
    }
    if (format === "weekly" && typeof entry.weekNumber !== "number") {
      return res.status(400).json({ message: "cada semana precisa de weekNumber" });
    }
  }
  const topicsList = Array.isArray(topics) ? (topics as ImportTopic[]) : [];
  const assessmentsList = Array.isArray(assessments) ? (assessments as ImportAssessment[]) : [];

  try {
    const userId = req.userId!;
    const periodStartYear = await getSubjectPeriodStartYear(userId, parsedSubjectId);
    if (periodStartYear === null) {
      return res.status(400).json({ message: "subjectId não existe" });
    }

    let examsCreated = 0;
    let examsUpdated = 0;

    await db.transaction(async (tx) => {
      await tx
        .delete(schema.syllabusEntries)
        .where(and(eq(schema.syllabusEntries.subjectId, parsedSubjectId), eq(schema.syllabusEntries.userId, userId)));
      await tx
        .delete(schema.syllabusTopics)
        .where(and(eq(schema.syllabusTopics.subjectId, parsedSubjectId), eq(schema.syllabusTopics.userId, userId)));
      await tx
        .delete(schema.syllabusAssessments)
        .where(and(eq(schema.syllabusAssessments.subjectId, parsedSubjectId), eq(schema.syllabusAssessments.userId, userId)));

      await tx.insert(schema.syllabusEntries).values(
        (entries as ImportEntry[]).map((entry) => ({
          subjectId: parsedSubjectId,
          format: format as "per_aula" | "weekly",
          lessonNumber: entry.lessonNumber,
          kind: entry.kind,
          date: entry.date,
          weekNumber: entry.weekNumber,
          periodLabel: entry.periodLabel,
          content: entry.content,
          userId,
        })),
      );

      if (topicsList.length > 0) {
        await tx.insert(schema.syllabusTopics).values(
          topicsList.map((topic) => ({
            subjectId: parsedSubjectId,
            code: topic.code,
            title: topic.title,
            position: topic.position,
            userId,
          })),
        );
      }

      if (assessmentsList.length > 0) {
        await tx.insert(schema.syllabusAssessments).values(
          assessmentsList.map((assessment) => ({
            subjectId: parsedSubjectId,
            title: assessment.title,
            weightLabel: assessment.weightLabel,
            dateLabel: assessment.dateLabel,
            coverageLabel: assessment.coverageLabel,
            position: assessment.position,
            userId,
          })),
        );

        // Linhas com data e peso reais (tipicamente "Primeira/Segunda/Terceira
        // Prova") viram provas de verdade em `exams`, pra não precisar
        // cadastrar tudo de novo à mão. Trabalhos/Exame Especial costumam vir
        // sem data ou peso reais e ficam de fora dessa criação automática —
        // find-or-create por título pra reimportação (peso/data mudou) não
        // duplicar, preservando a nota já lançada.
        for (const assessment of assessmentsList) {
          const examDate = parseAssessmentDate(assessment.dateLabel, periodStartYear);
          const examWeight = parseAssessmentWeight(assessment.weightLabel);
          if (!examDate || examWeight === null) continue;

          const [existing] = await tx
            .select({ id: schema.exams.id })
            .from(schema.exams)
            .where(
              and(
                eq(schema.exams.subjectId, parsedSubjectId),
                eq(schema.exams.userId, userId),
                eq(schema.exams.title, assessment.title),
              ),
            );

          if (existing) {
            await tx
              .update(schema.exams)
              .set({ date: examDate, weight: examWeight })
              .where(eq(schema.exams.id, existing.id));
            examsUpdated++;
          } else {
            await tx.insert(schema.exams).values({
              subjectId: parsedSubjectId,
              title: assessment.title,
              date: examDate,
              weight: examWeight,
              grade: null,
              userId,
            });
            examsCreated++;
          }
        }
      }
    });

    let message = `${entries.length} entrada(s) importada(s) com sucesso`;
    const examParts: string[] = [];
    if (examsCreated > 0) examParts.push(`${examsCreated} prova(s) criada(s)`);
    if (examsUpdated > 0) examParts.push(`${examsUpdated} prova(s) atualizada(s)`);
    if (examParts.length > 0) message += ` — ${examParts.join(", ")} automaticamente`;

    res.json({ message });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao importar plano de ensino" });
  }
});

router.delete("/subject/:subjectId", async (req, res) => {
  const subjectId = parseId(req.params.subjectId);
  if (subjectId === null) {
    return res.status(400).json({ message: "subjectId inválido" });
  }

  try {
    const userId = req.userId!;
    await db.transaction(async (tx) => {
      await tx
        .delete(schema.syllabusEntries)
        .where(and(eq(schema.syllabusEntries.subjectId, subjectId), eq(schema.syllabusEntries.userId, userId)));
      await tx
        .delete(schema.syllabusTopics)
        .where(and(eq(schema.syllabusTopics.subjectId, subjectId), eq(schema.syllabusTopics.userId, userId)));
      await tx
        .delete(schema.syllabusAssessments)
        .where(and(eq(schema.syllabusAssessments.subjectId, subjectId), eq(schema.syllabusAssessments.userId, userId)));
    });
    res.json({ message: "Plano de ensino removido" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao remover plano de ensino" });
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
