import * as schema from "../db/schema.js";
import { createCrudRouter } from "../lib/crudRouter.js";
import { optionalText, requiredId, requiredText, z } from "../lib/validate.js";

const scheduleSchema = z.object({
  subjectId: requiredId("subjectId"),
  weekday: requiredText("weekday"),
  startTime: requiredText("startTime"),
  endTime: requiredText("endTime"),
  room: optionalText,
});

export default createCrudRouter({
  table: schema.schedules,
  bodySchema: scheduleSchema,
  labels: { singular: "horário", plural: "horários", gender: "m" },
  subject: "required",
});
