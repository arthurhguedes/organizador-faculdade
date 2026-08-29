import * as schema from "../db/schema.js";
import { createCrudRouter } from "../lib/crudRouter.js";
import { requiredDate, requiredText, z } from "../lib/validate.js";

const dailyNoteSchema = z.object({
  date: requiredDate("date"),
  content: requiredText("content"),
  done: z.boolean().nullish().transform((value) => Boolean(value)),
});

export default createCrudRouter({
  table: schema.dailyNotes,
  bodySchema: dailyNoteSchema,
  labels: { singular: "anotação", plural: "anotações", gender: "f" },
  // Nunca teve `GET /:id`: a página Estudos carrega todas as anotações e
  // filtra por data no client.
  includeGetById: false,
});
