import * as schema from "../db/schema.js";
import { createCrudRouter } from "../lib/crudRouter.js";
import { choice, optionalId, optionalText, requiredDate, requiredInteger, z } from "../lib/validate.js";

const studySessionSchema = z.object({
  // Nullable de propósito: dá pra registrar estudo sem dizer de qual matéria
  // e vincular depois, pelo histórico da página Estudos.
  subjectId: optionalId("subjectId"),
  topic: optionalText,
  date: requiredDate("date"),
  durationMinutes: requiredInteger("durationMinutes").min(1, { error: "durationMinutes deve ser maior que zero" }),
  source: choice("source", ["pomodoro", "manual"]),
});

export default createCrudRouter({
  table: schema.studySessions,
  bodySchema: studySessionSchema,
  labels: { singular: "sessão de estudo", plural: "sessões de estudo", gender: "f" },
  subject: "optional",
  includeGetById: false,
});
