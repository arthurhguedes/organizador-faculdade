import { Router } from "express";
import { db } from "../db/index.js";
import * as schema from "../db/schema.js";
import { and, eq, inArray } from "drizzle-orm";
import { parseId } from "../lib/http.js";
import { clearSubjectDependencies } from "../lib/cascade.js";
import { parseBody, requiredText, z } from "../lib/validate.js";

const router = Router();

const professorSchema = z.object({
  name: requiredText("name"),
  // Email não passa por validação de formato: o "confirmar grade" cria
  // professor com placeholder `slug@a-definir.com`, e o usuário nem sempre
  // sabe o email real do professor na hora do cadastro.
  email: requiredText("email"),
});

router.get("/", async (req, res) => {
  try {
    const professors = await db.select().from(schema.professors).where(eq(schema.professors.userId, req.userId!));
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
    const [professor] = await db
      .select()
      .from(schema.professors)
      .where(and(eq(schema.professors.id, id), eq(schema.professors.userId, req.userId!)));
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
  const body = parseBody(professorSchema, req.body, res);
  if (!body) return;
  const { name, email } = body;

  try {
    const newProfessor = await db.insert(schema.professors).values({
      name,
      email,
      userId: req.userId!,
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

  const body = parseBody(professorSchema, req.body, res);
  if (!body) return;
  const { name, email } = body;

  try {
    const updated = await db
      .update(schema.professors)
      .set({ name, email })
      .where(and(eq(schema.professors.id, id), eq(schema.professors.userId, req.userId!)))
      .returning();

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
    const deleted = await db.transaction(async (tx) => {
      const userId = req.userId!;
      const linkedSubjects = await tx
        .select({ id: schema.subjects.id })
        .from(schema.subjects)
        .where(and(eq(schema.subjects.professorId, id), eq(schema.subjects.userId, userId)));
      const subjectIds = linkedSubjects.map((s) => s.id);

      if (subjectIds.length > 0) {
        await clearSubjectDependencies(tx, userId, subjectIds);
        await tx.delete(schema.subjects).where(and(inArray(schema.subjects.id, subjectIds), eq(schema.subjects.userId, userId)));
      }

      return tx
        .delete(schema.professors)
        .where(and(eq(schema.professors.id, id), eq(schema.professors.userId, userId)))
        .returning();
    });

    if (deleted.length === 0) {
      return res.status(404).json({ message: "Professor não encontrado" });
    }
    res.json({ message: "Professor removido com sucesso" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao remover professor" });
  }
});

export default router;
