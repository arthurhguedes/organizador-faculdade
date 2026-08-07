import { Router } from "express";
import { db } from "../db/index.js";
import * as schema from "../db/schema.js";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const professors = await db.select().from(schema.professors);
    res.json(professors);
  } catch (err) {
    res.status(500).json({ message: "Erro ao buscar professores" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [professor] = await db.select().from(schema.professors).where(eq(schema.professors.id, id));
    if (!professor) {
      return res.status(404).json({ message: "Professor não encontrado" });
    }
    res.json(professor);
  } catch (err) {
    res.status(500).json({ message: "Erro ao buscar professor" });
  }
});

router.post("/", async (req, res) => {
  const { name, email } = req.body;
  if (!name || !email) {
    return res.status(400).json({ message: "name e email são obrigatórios" });
  }

  try {
    const newProfessor = await db.insert(schema.professors).values({
      name,
      email,
    }).returning();
    res.json(newProfessor);
  } catch (err) {
    res.status(500).json({ message: "Erro ao criar professor" });
  }
});

router.put("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { name, email } = req.body;
  if (!name || !email) {
    return res.status(400).json({ message: "name e email são obrigatórios" });
  }

  try {
    const updated = await db.update(schema.professors).set({
      name,
      email,
    }).where(eq(schema.professors.id, id)).returning();

    if (updated.length === 0) {
      return res.status(404).json({ message: "Professor não encontrado" });
    }
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: "Erro ao atualizar professor" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const deleted = await db.delete(schema.professors).where(eq(schema.professors.id, id)).returning();
    if (deleted.length === 0) {
      return res.status(404).json({ message: "Professor não encontrado" });
    }
    res.json({ message: "Professor removido com sucesso" });
  } catch (err) {
    res.status(500).json({ message: "Erro ao remover professor" });
  }
});

export default router;
