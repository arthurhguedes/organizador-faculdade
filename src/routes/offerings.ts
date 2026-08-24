import { Router } from "express";
import { db } from "../db/index.js";
import * as schema from "../db/schema.js";
import { eq } from "drizzle-orm";

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

type ImportSchedule = {
  weekday: string;
  startTime: string;
  endTime: string;
  kind: string;
};

type ImportOffering = {
  professorName: string | null;
  subjectCode: string;
  subjectName: string;
  turma: string;
  curso: string | null;
  vagas: number | null;
  depto: string | null;
  workloadHours: number | null;
  theoryHours: number | null;
  practiceHours: number | null;
  schedules: ImportSchedule[];
};

router.post("/import", async (req, res) => {
  const offerings = req.body?.offerings;

  if (!Array.isArray(offerings) || offerings.length === 0) {
    return res.status(400).json({ message: "offerings deve ser uma lista não vazia" });
  }

  for (const offering of offerings as ImportOffering[]) {
    if (!offering.subjectCode || !offering.subjectName || !offering.turma) {
      return res.status(400).json({ message: "cada oferta precisa de subjectCode, subjectName e turma" });
    }
  }

  try {
    const userId = req.userId!;
    const CHUNK_SIZE = 500;

    await db.transaction(async (tx) => {
      await tx.delete(schema.offeringSchedules).where(eq(schema.offeringSchedules.userId, userId));
      await tx.delete(schema.courseOfferings).where(eq(schema.courseOfferings.userId, userId));

      const typedOfferings = offerings as ImportOffering[];
      const allSchedules: (ImportSchedule & { offeringId: number })[] = [];

      for (let i = 0; i < typedOfferings.length; i += CHUNK_SIZE) {
        const chunk = typedOfferings.slice(i, i + CHUNK_SIZE);
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
