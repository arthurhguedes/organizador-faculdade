import { Router } from "express";
import { db } from "../db/index.js";
import * as schema from "../db/schema.js";
import { eq } from "drizzle-orm";
import { nonEmptyArray, optionalNumber, optionalText, parseBody, requiredText, z } from "../lib/validate.js";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const offerings = await db.select().from(schema.courseOfferings).where(eq(schema.courseOfferings.userId, req.userId!));
    const slots = await db.select().from(schema.offeringSchedules).where(eq(schema.offeringSchedules.userId, req.userId!));

    const slotsByOffering = new Map<number, typeof slots>();
    for (const slot of slots) {
      const list = slotsByOffering.get(slot.offeringId) ?? [];
      list.push(slot);
      slotsByOffering.set(slot.offeringId, list);
    }

    const result = offerings.map((offering) => ({
      ...offering,
      schedules: slotsByOffering.get(offering.id) ?? [],
    }));

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao buscar ofertas" });
  }
});

const importScheduleSchema = z.object({
  weekday: requiredText("weekday"),
  startTime: requiredText("startTime"),
  endTime: requiredText("endTime"),
  kind: requiredText("kind"),
});

const importOfferingSchema = z.object({
  professorName: optionalText,
  subjectCode: requiredText("subjectCode"),
  subjectName: requiredText("subjectName"),
  turma: requiredText("turma"),
  curso: optionalText,
  // Arredondado em vez de recusado: a coluna é `integer` e a célula da
  // planilha às vezes vem como "40,0". Uma linha estranha não pode derrubar
  // a importação inteira das outras duas mil.
  vagas: optionalNumber("vagas").transform((value) => (value === null ? null : Math.round(value))),
  depto: optionalText,
  workloadHours: optionalNumber("workloadHours"),
  theoryHours: optionalNumber("theoryHours"),
  practiceHours: optionalNumber("practiceHours"),
  schedules: z.array(importScheduleSchema).nullish().transform((value) => value ?? []),
});

const offeringsImportSchema = z.object({
  offerings: nonEmptyArray("offerings", importOfferingSchema),
});

type ImportSchedule = z.infer<typeof importScheduleSchema>;

router.post("/import", async (req, res) => {
  const body = parseBody(offeringsImportSchema, req.body, res);
  if (!body) return;
  const { offerings } = body;

  try {
    const userId = req.userId!;
    const CHUNK_SIZE = 500;

    await db.transaction(async (tx) => {
      await tx.delete(schema.offeringSchedules).where(eq(schema.offeringSchedules.userId, userId));
      await tx.delete(schema.courseOfferings).where(eq(schema.courseOfferings.userId, userId));

      const allSchedules: (ImportSchedule & { offeringId: number })[] = [];

      for (let i = 0; i < offerings.length; i += CHUNK_SIZE) {
        const chunk = offerings.slice(i, i + CHUNK_SIZE);
        const inserted = await tx
          .insert(schema.courseOfferings)
          .values(
            chunk.map((offering) => ({
              professorName: offering.professorName,
              subjectCode: offering.subjectCode,
              subjectName: offering.subjectName,
              turma: offering.turma,
              curso: offering.curso,
              vagas: offering.vagas,
              depto: offering.depto,
              workloadHours: offering.workloadHours,
              theoryHours: offering.theoryHours,
              practiceHours: offering.practiceHours,
              userId,
            })),
          )
          .returning();

        chunk.forEach((offering, index) => {
          const offeringId = inserted[index]?.id;
          if (!offeringId) return;
          for (const slot of offering.schedules) {
            allSchedules.push({ ...slot, offeringId });
          }
        });
      }

      for (let i = 0; i < allSchedules.length; i += CHUNK_SIZE) {
        const chunk = allSchedules.slice(i, i + CHUNK_SIZE);
        await tx.insert(schema.offeringSchedules).values(
          chunk.map((slot) => ({
            offeringId: slot.offeringId,
            weekday: slot.weekday,
            startTime: slot.startTime,
            endTime: slot.endTime,
            kind: slot.kind,
            userId,
          })),
        );
      }
    });

    res.json({ message: `${offerings.length} ofertas importadas com sucesso` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao importar ofertas" });
  }
});

router.delete("/", async (req, res) => {
  try {
    const userId = req.userId!;
    await db.transaction(async (tx) => {
      await tx.delete(schema.offeringSchedules).where(eq(schema.offeringSchedules.userId, userId));
      await tx.delete(schema.courseOfferings).where(eq(schema.courseOfferings.userId, userId));
    });
    res.json({ message: "Catálogo de ofertas removido" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao remover ofertas" });
  }
});

export default router;
