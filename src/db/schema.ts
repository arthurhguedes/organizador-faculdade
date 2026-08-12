import { pgTable, serial, text, date, integer, real, timestamp } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  // Plano da conta. Hoje é trocado manualmente pelo próprio usuário (prévia,
  // sem cobrança real); quando o pagamento existir de verdade, é essa mesma
  // coluna que um webhook do provedor vai atualizar.
  plan: text("plan").notNull().default("free"),
  planBillingCycle: text("plan_billing_cycle"),
  premiumSince: timestamp("premium_since"),
});

export const periods = pgTable("periods", {
  id: serial("id").primaryKey(),
  label: text("label").notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
});

export const professors = pgTable("professors", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
});

export const subjects = pgTable("subjects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code"),
  workload: integer("workload").notNull(),
  periodId: integer("period_id").references(() => periods.id).notNull(),
  professorId: integer("professor_id").references(() => professors.id).notNull(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
});

export const schedules = pgTable("schedules", {
  id: serial("id").primaryKey(),
  subjectId: integer("subject_id").references(() => subjects.id).notNull(),
  weekday: text("weekday").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
});

export const assignments = pgTable("assignments", {
  id: serial("id").primaryKey(),
  subjectId: integer("subject_id").references(() => subjects.id).notNull(),
  title: text("title").notNull(),
  dueDate: date("due_date").notNull(),
  weight: real("weight").notNull(),
  grade: real("grade"),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
});

export const exams = pgTable("exams", {
  id: serial("id").primaryKey(),
  subjectId: integer("subject_id").references(() => subjects.id).notNull(),
  title: text("title").notNull(),
  date: date("date").notNull(),
  weight: real("weight").notNull(),
  grade: real("grade"),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
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
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
});

export const offeringSchedules = pgTable("offering_schedules", {
  id: serial("id").primaryKey(),
  offeringId: integer("offering_id").references(() => courseOfferings.id).notNull(),
  weekday: text("weekday").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  kind: text("kind").notNull(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
});
