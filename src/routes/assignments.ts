import * as schema from "../db/schema.js";
import { createCrudRouter } from "../lib/crudRouter.js";
import { optionalNumber, requiredDate, requiredId, requiredNumber, requiredText, z } from "../lib/validate.js";

const assignmentSchema = z.object({
  subjectId: requiredId("subjectId"),
  title: requiredText("title"),
  dueDate: requiredDate("dueDate"),
  weight: requiredNumber("weight"),
  grade: optionalNumber("grade"),
});

export default createCrudRouter({
  table: schema.assignments,
  bodySchema: assignmentSchema,
  labels: { singular: "atividade", plural: "atividades", gender: "f" },
  subject: "required",
});
