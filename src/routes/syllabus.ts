import { Router } from "express";
import { db } from "../db/index.js";
import * as schema from "../db/schema.js";
import { and, eq } from "drizzle-orm";
import { parseId } from "../lib/http.js";
import { choice, nonEmptyArray, optionalDate, optionalText, parseBody, requiredId, requiredInteger, requiredText, z } from "../lib/validate.js";

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
//
// Alguns planos de ensino expressam o peso como fração na própria coluna da
// tabela (ex: "1/6") em vez de já vir em porcentagem — converte pra
// porcentagem nesse caso, mesmo raciocínio já aplicado à fórmula "Nota final"
// do formato em prosa (ver NOTA_FINAL_TERM no parser do frontend).
function parseAssessmentWeight(weightLabel: string | null): number | null {
  if (!weightLabel) return null;
  const trimmed = weightLabel.trim();

  const percentMatch = trimmed.match(/^(\d+(?:[.,]\d+)?)\s*(?:%|pontos?)?$/i);
  if (percentMatch) {
    const value = Number(percentMatch[1]!.replace(",", "."));
    return Number.isFinite(value) ? value : null;
  }

  const fractionMatch = trimmed.match(/^(\d+(?:[.,]\d+)?)\s*\/\s*(\d+(?:[.,]\d+)?)$/);
  if (fractionMatch) {
    const numerator = Number(fractionMatch[1]!.replace(",", "."));
    const denominator = Number(fractionMatch[2]!.replace(",", "."));
    if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) return null;
    return Math.round((numerator / denominator) * 100 * 100) / 100;
  }

  return null;
}

// Cria ou atualiza (find-or-create por subjectId+title, preservando a nota já
// lançada) a prova de verdade em `exams` correspondente a uma linha da
// tabela de Avaliação — mesma lógica do POST /import, reaproveitada aqui pra
// rodar de novo quando o usuário edita peso/data numa linha que antes não
// tinha os dois (ex: aula que o PDF trazia sem data, "será definido
// posteriormente", e o usuário marca a data real depois que ela sai).
async function upsertExamFromAssessment(
  userId: number,
  subjectId: number,
  title: string,
  weightLabel: string | null,
  dateLabel: string | null,
  periodStartYear: number,
): Promise<"created" | "updated" | null> {
  const examDate = parseAssessmentDate(dateLabel, periodStartYear);
  const examWeight = parseAssessmentWeight(weightLabel);
  if (!examDate || examWeight === null) return null;

  const [existing] = await db
    .select({ id: schema.exams.id })
    .from(schema.exams)
    .where(and(eq(schema.exams.subjectId, subjectId), eq(schema.exams.userId, userId), eq(schema.exams.title, title)));

  if (existing) {
    await db.update(schema.exams).set({ date: examDate, weight: examWeight }).where(eq(schema.exams.id, existing.id));
    return "updated";
  }

  await db.insert(schema.exams).values({ subjectId, title, date: examDate, weight: examWeight, grade: null, userId });
  return "created";
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

const importEntrySchema = z.object({
  lessonNumber: z.int().nullish().transform((value) => value ?? null),
  kind: optionalText,
  date: optionalDate("date"),
  weekNumber: z.int().nullish().transform((value) => value ?? null),
  periodLabel: optionalText,
  content: requiredText("content"),
});

const importTopicSchema = z.object({
  code: requiredText("code"),
  title: requiredText("title"),
  position: requiredInteger("position"),
});

const importAssessmentSchema = z.object({
  title: requiredText("title"),
  // Texto livre e às vezes incompletos: o PDF traz coisas como peso em branco
  // ou data "Será definido posteriormente".
  weightLabel: optionalText,
  dateLabel: optionalText,
  coverageLabel: optionalText,
  position: requiredInteger("position"),
});

// `format` decide quais campos de `entries` são obrigatórios: aula-a-aula
// precisa de lessonNumber+date, semanal precisa de weekNumber. Por isso a
// checagem é um superRefine no objeto inteiro, não um campo isolado.
const syllabusImportSchema = z
  .object({
    subjectId: requiredId("subjectId"),
    format: choice("format", ["per_aula", "weekly"]),
    entries: nonEmptyArray("entries", importEntrySchema),
    topics: z.array(importTopicSchema).nullish().transform((value) => value ?? []),
    assessments: z.array(importAssessmentSchema).nullish().transform((value) => value ?? []),
  })
  .superRefine((body, ctx) => {
    for (const entry of body.entries) {
      if (body.format === "per_aula" && (entry.date === null || entry.lessonNumber === null)) {
        ctx.addIssue({ code: "custom", message: "cada aula precisa de lessonNumber e date" });
        return;
      }
      if (body.format === "weekly" && entry.weekNumber === null) {
        ctx.addIssue({ code: "custom", message: "cada semana precisa de weekNumber" });
        return;
      }
    }
  });

// Atualização parcial: só sobrescreve o que vier no corpo, por isso todo
// campo é opcional aqui (diferente do schema de importação acima).
const assessmentPatchSchema = z.object({
  title: requiredText("title").optional(),
  weightLabel: optionalText.optional(),
  dateLabel: optionalText.optional(),
  coverageLabel: optionalText.optional(),
});

router.post("/import", async (req, res) => {
  const body = parseBody(syllabusImportSchema, req.body, res);
  if (!body) return;
  const { subjectId: parsedSubjectId, format, entries } = body;
  const topicsList = body.topics;
  const assessmentsList = body.assessments;

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
        entries.map((entry) => ({
          subjectId: parsedSubjectId,
          format,
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

// Edição manual de uma linha da tabela de Avaliação — os campos vêm do PDF
// como texto livre e às vezes incompletos (ex: data "Será definido
// posteriormente"). Depois de salvar, tenta de novo criar/atualizar a prova
// de verdade em `exams` (ver upsertExamFromAssessment), pra quando o usuário
// preenche a data que faltava a atividade passar a aparecer em Provas e
// Atividades sem precisar cadastrar tudo de novo à mão.
router.patch("/assessments/:id", async (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) {
    return res.status(400).json({ message: "id inválido" });
  }

  const body = parseBody(assessmentPatchSchema, req.body, res);
  if (!body) return;
  const { title, weightLabel, dateLabel, coverageLabel } = body;

  try {
    const userId = req.userId!;
    const updates: Partial<typeof schema.syllabusAssessments.$inferInsert> = {};
    if (title !== undefined) updates.title = title;
    if (weightLabel !== undefined) updates.weightLabel = weightLabel;
    if (dateLabel !== undefined) updates.dateLabel = dateLabel;
    if (coverageLabel !== undefined) updates.coverageLabel = coverageLabel;

    const [updated] = await db
      .update(schema.syllabusAssessments)
      .set(updates)
      .where(and(eq(schema.syllabusAssessments.id, id), eq(schema.syllabusAssessments.userId, userId)))
      .returning();
    if (!updated) {
      return res.status(404).json({ message: "Avaliação não encontrada" });
    }

    const periodStartYear = await getSubjectPeriodStartYear(userId, updated.subjectId);
    const examStatus =
      periodStartYear === null
        ? null
        : await upsertExamFromAssessment(
            userId,
            updated.subjectId,
            updated.title,
            updated.weightLabel,
            updated.dateLabel,
            periodStartYear,
          );

    let message = "Avaliação atualizada";
    if (examStatus === "created") message += " — prova criada automaticamente";
    if (examStatus === "updated") message += " — prova atualizada automaticamente";

    res.json({ assessment: updated, message });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao atualizar avaliação" });
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
