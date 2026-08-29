import * as schema from "../db/schema.js";
import { createCrudRouter } from "../lib/crudRouter.js";
import { choice, optionalInteger, optionalText, requiredInteger, requiredText, z } from "../lib/validate.js";

const curriculumSubjectSchema = z.object({
  name: requiredText("name"),
  code: optionalText,
  workload: requiredInteger("workload"),
  suggestedPeriod: optionalInteger("suggestedPeriod"),
  status: choice("status", ["pendente", "cursando", "concluida"]).default("pendente"),
  kind: choice("kind", ["obrigatoria", "eletiva", "atividade"]).default("obrigatoria"),
  completedHours: optionalInteger("completedHours").transform((value) => value ?? 0),
});

export default createCrudRouter({
  table: schema.curriculumSubjects,
  bodySchema: curriculumSubjectSchema,
  labels: {
    singular: "matéria da matriz",
    plural: "matérias da matriz",
    gender: "f",
    // A listagem é a matriz inteira, não "as matérias da matriz".
    listError: "Erro ao buscar matriz curricular",
  },
});
