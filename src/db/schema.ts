import { pgTable, serial, text, date, integer, real, timestamp } from "drizzle-orm/pg-core";

export const periods = pgTable("periods", {
  id: serial("id").primaryKey(),
  label: text("label").notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
});

export const professors = pgTable("professors", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
});

export const subjects = pgTable("subjects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  workload: integer("workload").notNull(),
  periodId: integer("period_id").references(() => periods.id).notNull(),
  professorId: integer("professor_id").references(() => professors.id).notNull(),
});

export const schedules = pgTable("schedules", {
  id: serial("id").primaryKey(),
  subjectId: integer("subject_id").references(() => subjects.id).notNull(),
  weekday: text("weekday").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
});

export const assignments = pgTable("assignments", {
  id: serial("id").primaryKey(),
  subjectId: integer("subject_id").references(() => subjects.id).notNull(),
  title: text("title").notNull(),
  dueDate: date("due_date").notNull(),
  weight: real("weight").notNull(),
  grade: real("grade"),
});

export const exams = pgTable("exams", {
  id: serial("id").primaryKey(),
  subjectId: integer("subject_id").references(() => subjects.id).notNull(),
  title: text("title").notNull(),
  date: date("date").notNull(),
  weight: real("weight").notNull(),
  grade: real("grade"),
});

// Catálogo de ofertas da faculdade (importado de planilha por semestre) —
// separado das tabelas pessoais acima: é o universo de turmas disponíveis,
// não o que o usuário de fato cursa.
export const courseOfferings = pgTable("course_offerings", {
  id: serial("id").primaryKey(),
  professorName: text("professor_name"),
  subjectCode: text("subject_code").notNull(),
  subjectName: text("subject_name").notNull(),
  turma: text("turma").notNull(),
  curso: text("curso"),
  vagas: integer("vagas"),
  depto: text("depto"),
  workloadHours: real("workload_hours"),
  theoryHours: real("theory_hours"),
  practiceHours: real("practice_hours"),
  importedAt: timestamp("imported_at").defaultNow().notNull(),
});

export const offeringSchedules = pgTable("offering_schedules", {
  id: serial("id").primaryKey(),
  offeringId: integer("offering_id").references(() => courseOfferings.id).notNull(),
  weekday: text("weekday").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  kind: text("kind").notNull(),
});
