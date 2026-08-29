import * as schema from "../db/schema.js";
import { createCrudRouter } from "../lib/crudRouter.js";
import { optionalNumber, requiredDate, requiredId, requiredNumber, requiredText, z } from "../lib/validate.js";

const examSchema = z.object({
  subjectId: requiredId("subjectId"),
  title: requiredText("title"),
  date: requiredDate("date"),
  weight: requiredNumber("weight"),
  grade: optionalNumber("grade"),
});

export default createCrudRouter({
  table: schema.exams,
  bodySchema: examSchema,
  labels: { singular: "prova", plural: "provas", gender: "f" },
  subject: "required",
});
