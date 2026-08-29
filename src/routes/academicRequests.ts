import * as schema from "../db/schema.js";
import { createCrudRouter } from "../lib/crudRouter.js";
import { choice, optionalDate, optionalId, optionalText, requiredDate, z } from "../lib/validate.js";

const academicRequestSchema = z.object({
  // Lista fechada: a faculdade não expõe um catálogo de tipos de requerimento.
  type: choice("type", ["prerequisite_waiver", "enrollment_adjustment", "leave_of_absence", "credit_recognition"]),
  // Opcional: trancamento de período inteiro não se refere a uma matéria.
  subjectId: optionalId("subjectId"),
  requirements: optionalText,
  status: choice("status", ["pendente", "aprovado", "recusado"]).default("pendente"),
  submittedAt: requiredDate("submittedAt"),
  resolvedAt: optionalDate("resolvedAt"),
  rejectionReason: optionalText,
});

export default createCrudRouter({
  table: schema.academicRequests,
  bodySchema: academicRequestSchema,
  labels: { singular: "requerimento", plural: "requerimentos", gender: "m" },
  subject: "optional",
});
