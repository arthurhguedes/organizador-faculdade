import * as schema from "../db/schema.js";
import { createCrudRouter } from "../lib/crudRouter.js";
import { requiredDate, requiredText, z } from "../lib/validate.js";

const periodSchema = z.object({
  label: requiredText("label"),
  startDate: requiredDate("startDate"),
  endDate: requiredDate("endDate"),
});

export default createCrudRouter({
  table: schema.periods,
  bodySchema: periodSchema,
  labels: { singular: "período", plural: "períodos", gender: "m" },
  // Diferente de professor, apagar um período **não** apaga as matérias dele:
  // um período com matérias é histórico do curso, não lixo pra limpar.
  deleteConflictMessage: "Não é possível remover: existem matérias vinculadas a este período",
});
