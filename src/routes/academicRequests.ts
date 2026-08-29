import { Router } from "express";
import { db } from "../db/index.js";
import * as schema from "../db/schema.js";
import { and, eq } from "drizzle-orm";
import { parseId, isForeignKeyViolation } from "../lib/http.js";

const router = Router();

const VALID_TYPES = ["prerequisite_waiver", "enrollment_adjustment", "leave_of_absence", "credit_recognition"];
const VALID_STATUSES = ["pendente", "aprovado", "recusado"];

// Mesmo padrão das outras rotas: um subjectId de outro usuário (ou
// inexistente) tem que virar 400, não uma linha apontando pra matéria alheia
// nem um 500 de violação de FK.
async function ownsSubject(userId: number, subjectId: number): Promise<boolean> {
  const [subject] = await db
    .select({ id: schema.subjects.id })
    .from(schema.subjects)
    .where(and(eq(schema.subjects.id, subjectId), eq(schema.subjects.userId, userId)));
  return Boolean(subject);
}

router.get("/", async (req, res) => {
  try {
    const items = await db
      .select()
      .from(schema.academicRequests)
      .where(eq(schema.academicRequests.userId, req.userId!));
    res.json(items);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao buscar requerimentos" });
  }
});

router.get("/:id", async (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) {
    return res.status(400).json({ message: "id inválido" });
  }

  try {
    const [item] = await db
      .select()
      .from(schema.academicRequests)
      .where(and(eq(schema.academicRequests.id, id), eq(schema.academicRequests.userId, req.userId!)));
    if (!item) {
      return res.status(404).json({ message: "Requerimento não encontrado" });
    }
    res.json(item);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao buscar requerimento" });
  }
});

router.post("/", async (req, res) => {
  const { type, subjectId, requirements, status, submittedAt, resolvedAt, rejectionReason } = req.body ?? {};
  if (!type || !submittedAt) {
    return res.status(400).json({ message: "type e submittedAt são obrigatórios" });
  }
  if (!VALID_TYPES.includes(type)) {
    return res.status(400).json({ message: `type deve ser um de: ${VALID_TYPES.join(", ")}` });
  }
  if (status !== undefined && !VALID_STATUSES.includes(status)) {
    return res.status(400).json({ message: `status deve ser um de: ${VALID_STATUSES.join(", ")}` });
  }

  try {
    if (subjectId && !(await ownsSubject(req.userId!, subjectId))) {
      return res.status(400).json({ message: "subjectId não existe" });
    }

    const newItem = await db.insert(schema.academicRequests).values({
      type,
      subjectId: subjectId || null,
      requirements: requirements || null,
      status: status || "pendente",
      submittedAt,
      resolvedAt: resolvedAt || null,
      rejectionReason: rejectionReason || null,
      userId: req.userId!,
    }).returning();
    res.json(newItem);
  } catch (err) {
    console.error(err);
    if (isForeignKeyViolation(err)) {
      return res.status(400).json({ message: "subjectId não existe" });
    }
    res.status(500).json({ message: "Erro ao criar requerimento" });
  }
});

router.put("/:id", async (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) {
    return res.status(400).json({ message: "id inválido" });
  }

  const { type, subjectId, requirements, status, submittedAt, resolvedAt, rejectionReason } = req.body ?? {};
  if (!type || !submittedAt) {
    return res.status(400).json({ message: "type e submittedAt são obrigatórios" });
  }
  if (!VALID_TYPES.includes(type)) {
    return res.status(400).json({ message: `type deve ser um de: ${VALID_TYPES.join(", ")}` });
  }
  if (status !== undefined && !VALID_STATUSES.includes(status)) {
    return res.status(400).json({ message: `status deve ser um de: ${VALID_STATUSES.join(", ")}` });
  }

  try {
    if (subjectId && !(await ownsSubject(req.userId!, subjectId))) {
      return res.status(400).json({ message: "subjectId não existe" });
    }

    const updated = await db
      .update(schema.academicRequests)
      .set({
        type,
        subjectId: subjectId || null,
        requirements: requirements || null,
        status: status || "pendente",
        submittedAt,
        resolvedAt: resolvedAt || null,
        rejectionReason: rejectionReason || null,
      })
      .where(and(eq(schema.academicRequests.id, id), eq(schema.academicRequests.userId, req.userId!)))
      .returning();

    if (updated.length === 0) {
      return res.status(404).json({ message: "Requerimento não encontrado" });
    }
    res.json(updated);
  } catch (err) {
    console.error(err);
    if (isForeignKeyViolation(err)) {
      return res.status(400).json({ message: "subjectId não existe" });
    }
    res.status(500).json({ message: "Erro ao atualizar requerimento" });
  }
});

router.delete("/:id", async (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) {
    return res.status(400).json({ message: "id inválido" });
  }

  try {
    const deleted = await db
      .delete(schema.academicRequests)
      .where(and(eq(schema.academicRequests.id, id), eq(schema.academicRequests.userId, req.userId!)))
      .returning();

    if (deleted.length === 0) {
      return res.status(404).json({ message: "Requerimento não encontrado" });
    }
    res.json({ message: "Requerimento removido com sucesso" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao remover requerimento" });
  }
});

export default router;
