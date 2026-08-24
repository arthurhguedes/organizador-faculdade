import { Router } from "express";
import { db } from "../db/index.js";
import * as schema from "../db/schema.js";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const allocations = await db
      .select()
      .from(schema.roomAllocations)
      .where(eq(schema.roomAllocations.userId, req.userId!));
    res.json(allocations);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao buscar mapa de salas" });
  }
});

type ImportAllocation = {
  room: string;
  roomCapacity: number | null;
  semesterLabel: string | null;
  subjectCode: string | null;
  turma: string | null;
  subjectName: string;
  professorName: string | null;
  weekday: string;
  startTime: string;
  endTime: string;
  kind: string | null;
};

router.post("/import", async (req, res) => {
  const allocations = req.body?.allocations;

  if (!Array.isArray(allocations) || allocations.length === 0) {
    return res.status(400).json({ message: "allocations deve ser uma lista não vazia" });
  }

  for (const allocation of allocations as ImportAllocation[]) {
    if (!allocation.room || !allocation.subjectName || !allocation.weekday || !allocation.startTime || !allocation.endTime) {
      return res.status(400).json({ message: "cada entrada precisa de room, subjectName, weekday, startTime e endTime" });
    }
  }

  try {
    const userId = req.userId!;
    const CHUNK_SIZE = 500;
    const typedAllocations = allocations as ImportAllocation[];

    await db.transaction(async (tx) => {
      await tx.delete(schema.roomAllocations).where(eq(schema.roomAllocations.userId, userId));

      for (let i = 0; i < typedAllocations.length; i += CHUNK_SIZE) {
        const chunk = typedAllocations.slice(i, i + CHUNK_SIZE);
        await tx.insert(schema.roomAllocations).values(
          chunk.map((allocation) => ({
            room: allocation.room,
            roomCapacity: allocation.roomCapacity,
            semesterLabel: allocation.semesterLabel,
            subjectCode: allocation.subjectCode,
            turma: allocation.turma,
            subjectName: allocation.subjectName,
            professorName: allocation.professorName,
            weekday: allocation.weekday,
            startTime: allocation.startTime,
            endTime: allocation.endTime,
            kind: allocation.kind,
            userId,
          })),
        );
      }
    });

    res.json({ message: `${allocations.length} entradas do mapa de salas importadas com sucesso` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao importar mapa de salas" });
  }
});

router.delete("/", async (req, res) => {
  try {
    await db.delete(schema.roomAllocations).where(eq(schema.roomAllocations.userId, req.userId!));
    res.json({ message: "Mapa de salas removido" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao remover mapa de salas" });
  }
});

export default router;
