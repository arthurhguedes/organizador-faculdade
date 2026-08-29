import { and, eq, inArray } from "drizzle-orm";
import * as schema from "../db/schema.js";
import { clearSubjectDependencies } from "../lib/cascade.js";
import { createCrudRouter } from "../lib/crudRouter.js";
import { requiredText, z } from "../lib/validate.js";

const professorSchema = z.object({
  name: requiredText("name"),
  // Email não passa por validação de formato: o "confirmar grade" cria
  // professor com placeholder `slug@a-definir.com`, e o usuário nem sempre
  // sabe o email real do professor na hora do cadastro.
  email: requiredText("email"),
});

export default createCrudRouter({
  table: schema.professors,
  bodySchema: professorSchema,
  labels: { singular: "professor", plural: "professores", gender: "m" },
  // Exclusão em cascata: as matérias do professor (e tudo que pendura nelas)
  // saem junto, na mesma transação. Sem isso o DELETE morria em erro de FK.
  beforeDelete: async (tx, userId, id) => {
    const linkedSubjects = await tx
      .select({ id: schema.subjects.id })
      .from(schema.subjects)
      .where(and(eq(schema.subjects.professorId, id), eq(schema.subjects.userId, userId)));
    const subjectIds = linkedSubjects.map((subject) => subject.id);
    if (subjectIds.length === 0) return;

    await clearSubjectDependencies(tx, userId, subjectIds);
    await tx
      .delete(schema.subjects)
      .where(and(inArray(schema.subjects.id, subjectIds), eq(schema.subjects.userId, userId)));
  },
});
