import { Router } from "express";
import { db } from "../db/index.js";
import * as schema from "../db/schema.js";
import { eq } from "drizzle-orm";
import { parseId, isForeignKeyViolation } from "../lib/http.js";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const professors = await db.select().from(schema.professors);
    res.json(professors);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao buscar professores" });
  }
});

router.get("/:id", async (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) {
    return res.status(400).json({ message: "id inválido" });
  }

  try {
    const [professor] = await db.select().from(schema.professors).where(eq(schema.professors.id, id));
    if (!professor) {
      return res.status(404).json({ message: "Professor não encontrado" });
    }
    res.json(professor);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao buscar professor" });
  }
});

router.post("/", async (req, res) => {
  const { name, email } = req.body ?? {};
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
    console.error(err);
    res.status(500).json({ message: "Erro ao criar professor" });
  }
});

router.put("/:id", async (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) {
    return res.status(400).json({ message: "id inválido" });
  }

  const { name, email } = req.body ?? {};
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
    console.error(err);
    res.status(500).json({ message: "Erro ao atualizar professor" });
  }
});

router.delete("/:id", async (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) {
    return res.status(400).json({ message: "id inválido" });
  }

  try {
    const deleted = await db.delete(schema.professors).where(eq(schema.professors.id, id)).returning();
    if (deleted.length === 0) {
      return res.status(404).json({ message: "Professor não encontrado" });
    }
    res.json({ message: "Professor removido com sucesso" });
  } catch (err) {
    console.error(err);
    if (isForeignKeyViolation(err)) {
      return res.status(400).json({ message: "Não é possível remover: existem matérias vinculadas a este professor" });
    }
    res.status(500).json({ message: "Erro ao remover professor" });
  }
});

export default router;
