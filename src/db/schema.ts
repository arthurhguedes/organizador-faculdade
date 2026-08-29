import { pgTable, serial, text, date, integer, real, timestamp, boolean, index } from "drizzle-orm/pg-core";

// Índices — o Postgres NÃO cria índice automático pra chave estrangeira (só
// pra primary key e unique), então tudo abaixo é explícito. Três formatos,
// cada um respondendo a um padrão de query real do app:
//
//   1. `(user_id)` sozinho, nas tabelas sem `subject_id`: toda listagem do app
//      é um `WHERE user_id = ?` (o app é multi-tenant, ver `requireAuth`).
//   2. `(user_id, subject_id)` composto, nas tabelas filhas de matéria: cobre
//      tanto o `WHERE subject_id = ? AND user_id = ?` do detalhe da matéria
//      quanto o `WHERE user_id = ?` da listagem — o Postgres usa um índice
//      composto pela coluna da esquerda, então não precisa de um `(user_id)`
//      separado, que só custaria escrita à toa.
//   3. `(subject_id)`/`(period_id)`/`(professor_id)`/`(offering_id)`/
//      `(schedule_id)` sozinhos: o composto do item 2 não serve aqui porque
//      `user_id` vem na frente. Esses existem pela checagem de integridade que
//      o Postgres roda ao apagar a linha-pai (apagar uma matéria faz ele
//      procurar filhos em ~10 tabelas); sem índice, cada uma vira seq scan.

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  // Campos exigidos pelo modelo `user` do Better Auth.
  emailVerified: boolean("email_verified").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),

  // Perfil — todos opcionais, preenchidos depois do cadastro.
  institution: text("institution"),
  course: text("course"),
  birthDate: date("birth_date"), // idade é sempre calculada a partir daqui, nunca armazenada
  avatarImage: text("avatar_image"), // data URL base64, já redimensionada/comprimida no client
  linkedinUrl: text("linkedin_url"),
  githubUrl: text("github_url"),
  instagramUrl: text("instagram_url"),
  xUrl: text("x_url"),
  // Único entre usuários. Escolhido obrigatoriamente no cadastro por
  // email/senha (ver plugin `username` em src/auth.ts); contas criadas via
  // Google ficam sem um até o usuário definir no Perfil — por isso a coluna
  // continua nullable (Postgres permite múltiplos NULL num índice unique).
  // Usado futuramente pro sistema de ranking/amigos, e hoje também pra logar
  // com usuário em vez de email.
  username: text("username").unique(),
  // Mantém a capitalização original digitada no cadastro; `username` guarda
  // sempre a versão normalizada (minúscula) usada pra unicidade/login. O
  // plugin `username` do Better Auth é quem gerencia as duas.
  displayUsername: text("display_username"),
});

// Tabelas do Better Auth — sessão ativa (cookie) e contas de login (uma por
// provider: "credential" pra email+senha, "google" pra OAuth). Um mesmo
// usuário pode ter as duas ao mesmo tempo.
export const sessions = pgTable("sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  index("sessions_user_id_idx").on(t.userId),
]);

export const accounts = pgTable("accounts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(), // "credential" | "google"
  password: text("password"), // hash bcrypt, só em contas "credential"
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  index("accounts_user_id_idx").on(t.userId),
]);

export const verifications = pgTable("verifications", {
  id: serial("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => [
  index("verifications_identifier_idx").on(t.identifier),
]);

export const periods = pgTable("periods", {
  id: serial("id").primaryKey(),
  label: text("label").notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
}, (t) => [
  index("periods_user_id_idx").on(t.userId),
]);

export const professors = pgTable("professors", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
}, (t) => [
  index("professors_user_id_idx").on(t.userId),
]);

export const subjects = pgTable("subjects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code"),
  workload: integer("workload").notNull(),
  periodId: integer("period_id").references(() => periods.id).notNull(),
  professorId: integer("professor_id").references(() => professors.id).notNull(),
  // Contador simples de faltas, sem data/aula vinculada. Limite calculado no
  // client como 25% da carga horária (regra padrão MEC), não armazenado aqui.
  absences: integer("absences").notNull().default(0),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
}, (t) => [
  index("subjects_user_id_period_id_idx").on(t.userId, t.periodId),
  index("subjects_user_id_professor_id_idx").on(t.userId, t.professorId),
  index("subjects_period_id_idx").on(t.periodId),
  index("subjects_professor_id_idx").on(t.professorId),
]);

export const schedules = pgTable("schedules", {
  id: serial("id").primaryKey(),
  subjectId: integer("subject_id").references(() => subjects.id).notNull(),
  weekday: text("weekday").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  // Sala onde a aula acontece, texto livre (ex: "203", "Lab 2") — opcional
  // porque nem todo horário cadastrado sabe a sala de antemão.
  room: text("room"),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
}, (t) => [
  index("schedules_user_id_subject_id_idx").on(t.userId, t.subjectId),
  index("schedules_subject_id_idx").on(t.subjectId),
]);

export const assignments = pgTable("assignments", {
  id: serial("id").primaryKey(),
  subjectId: integer("subject_id").references(() => subjects.id).notNull(),
  title: text("title").notNull(),
  dueDate: date("due_date").notNull(),
  weight: real("weight").notNull(),
  grade: real("grade"),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
}, (t) => [
  index("assignments_user_id_subject_id_idx").on(t.userId, t.subjectId),
  index("assignments_subject_id_idx").on(t.subjectId),
]);

export const exams = pgTable("exams", {
  id: serial("id").primaryKey(),
  subjectId: integer("subject_id").references(() => subjects.id).notNull(),
  title: text("title").notNull(),
  date: date("date").notNull(),
  weight: real("weight").notNull(),
  grade: real("grade"),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
}, (t) => [
  index("exams_user_id_subject_id_idx").on(t.userId, t.subjectId),
  index("exams_subject_id_idx").on(t.subjectId),
]);

// Plano de ensino — cronograma importado do PDF que o professor disponibiliza.
// Import = replace total por matéria, mesmo raciocínio de `course_offerings`:
// é sempre o cronograma vigente, não um histórico de versões. Cada professor
// formata isso de um jeito: `format` distingue aula-a-aula (lessonNumber +
// kind T/P + data cheia) de semanal (weekNumber + período em texto livre,
// tipo "24-28/ago" — sem ano, não dá pra reduzir a uma `date` única). Os
// campos específicos de cada formato ficam nullable e só um par é preenchido
// por linha, dependendo de `format`.
export const syllabusEntries = pgTable("syllabus_entries", {
  id: serial("id").primaryKey(),
  subjectId: integer("subject_id").references(() => subjects.id).notNull(),
  format: text("format").notNull().default("per_aula"), // "per_aula" | "weekly"
  lessonNumber: integer("lesson_number"), // per_aula only
  kind: text("kind"), // "T" (teórica) | "P" (prática) | null (ex: feriado) — per_aula only
  date: date("date"), // per_aula only
  weekNumber: integer("week_number"), // weekly only
  periodLabel: text("period_label"), // weekly only, texto cru do intervalo, ex: "24-28/ago"
  content: text("content").notNull(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
}, (t) => [
  index("syllabus_entries_user_id_subject_id_idx").on(t.userId, t.subjectId),
  index("syllabus_entries_subject_id_idx").on(t.subjectId),
]);

// Conteúdo programático do plano de ensino — lista hierárquica de tópicos da
// matéria (ex: "1" "Sistema de equações lineares e matrizes", "1.1"
// "Eliminação Gaussiana"). Profundidade é derivada de `code` no client
// (número de pontos), não armazenada. Import = replace total por matéria,
// junto com `syllabusEntries`/`syllabusAssessments` na mesma importação.
export const syllabusTopics = pgTable("syllabus_topics", {
  id: serial("id").primaryKey(),
  subjectId: integer("subject_id").references(() => subjects.id).notNull(),
  code: text("code").notNull(), // "1", "1.1", "6.2"
  title: text("title").notNull(),
  position: integer("position").notNull(), // ordem de leitura no PDF
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
}, (t) => [
  index("syllabus_topics_user_id_subject_id_idx").on(t.userId, t.subjectId),
  index("syllabus_topics_subject_id_idx").on(t.subjectId),
]);

// Tabela "Avaliação" do plano de ensino — puramente informativo/planejamento,
// sem qualquer vínculo com `exams` (que continua sendo a fonte da verdade das
// provas reais/notas do usuário). Peso/data/cobertura ficam texto livre
// nullable porque o PDF às vezes não preenche com valores estruturados (ex:
// peso em branco, data "Será definido posteriormente"). `coverageLabel`
// ("Semanas 1 – 5") é resolvido em tópicos cobertos só no client, cruzando
// com `syllabusEntries` do tipo "weekly" — não persistido aqui.
export const syllabusAssessments = pgTable("syllabus_assessments", {
  id: serial("id").primaryKey(),
  subjectId: integer("subject_id").references(() => subjects.id).notNull(),
  title: text("title").notNull(),
  weightLabel: text("weight_label"),
  dateLabel: text("date_label"),
  coverageLabel: text("coverage_label"),
  position: integer("position").notNull(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
}, (t) => [
  index("syllabus_assessments_user_id_subject_id_idx").on(t.userId, t.subjectId),
  index("syllabus_assessments_subject_id_idx").on(t.subjectId),
]);

// Marca uma aula específica (matéria + data + horário, quando derivado de
// `schedules`) como falta, clicada direto no Calendário. `scheduleId` é
// nulo quando a ocorrência vem de um plano de ensino aula-a-aula (uma linha
// por data, sem ambiguidade de qual horário da matéria é); quando vem da
// expansão de `schedules` (matéria sem plano aula-a-aula, ex: formato
// semanal), guarda qual horário específico foi faltado, já que o mesmo dia
// pode ter mais de um bloco de aula da mesma matéria. Puramente aditivo ao
// contador manual que já existe em `subjects.absences` — marcar/desmarcar
// aqui soma/subtrai 1 desse mesmo contador, não substitui o +/- manual.
// "falta": eu não fui, conta pro contador de faltas. "sem_aula": não teve
// aula nesse dia (feriado, professor cancelou) — registra a exceção pra não
// confundir com presença/falta, mas não mexe no contador, já que a expansão
// de `schedules` não sabe distinguir uma aula que de fato aconteceu de uma
// que foi cancelada.
export const attendanceMarks = pgTable("attendance_marks", {
  id: serial("id").primaryKey(),
  subjectId: integer("subject_id").references(() => subjects.id, { onDelete: "cascade" }).notNull(),
  scheduleId: integer("schedule_id").references(() => schedules.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  kind: text("kind").notNull().default("falta"),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
}, (t) => [
  index("attendance_marks_user_id_subject_id_idx").on(t.userId, t.subjectId),
  index("attendance_marks_subject_id_idx").on(t.subjectId),
  index("attendance_marks_schedule_id_idx").on(t.scheduleId),
]);

// Blocos de estudo — registrados manualmente ou automaticamente ao completar
// um ciclo de foco do Pomodoro. "topic" é texto livre (assunto dentro da
// matéria), sem tabela própria: não precisa ser reaproveitado em outro lugar.
// subjectId é opcional: o Pomodoro não obriga escolher matéria antes de
// começar — dá pra vincular depois, editando a sessão já registrada.
export const studySessions = pgTable("study_sessions", {
  id: serial("id").primaryKey(),
  subjectId: integer("subject_id").references(() => subjects.id),
  topic: text("topic"),
  date: date("date").notNull(),
  durationMinutes: integer("duration_minutes").notNull(),
  source: text("source").notNull(), // "pomodoro" | "manual"
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
}, (t) => [
  index("study_sessions_user_id_subject_id_idx").on(t.userId, t.subjectId),
  index("study_sessions_subject_id_idx").on(t.subjectId),
]);

// Anotações diárias soltas (ex: coisas para estudar) — múltiplas por dia,
// estilo checklist. Sem vínculo com matéria: são notas gerais do dia.
export const dailyNotes = pgTable("daily_notes", {
  id: serial("id").primaryKey(),
  date: date("date").notNull(),
  content: text("content").notNull(),
  done: boolean("done").notNull().default(false),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
}, (t) => [
  index("daily_notes_user_id_idx").on(t.userId),
]);

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
}, (t) => [
  index("course_offerings_user_id_idx").on(t.userId),
]);

export const offeringSchedules = pgTable("offering_schedules", {
  id: serial("id").primaryKey(),
  offeringId: integer("offering_id").references(() => courseOfferings.id).notNull(),
  weekday: text("weekday").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  kind: text("kind").notNull(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
}, (t) => [
  index("offering_schedules_user_id_offering_id_idx").on(t.userId, t.offeringId),
  index("offering_schedules_offering_id_idx").on(t.offeringId),
]);

// Matriz curricular — universo de matérias que o curso exige, independente
// de `periods`/`subjects` (que são o que o usuário de fato cursou). Cadastro
// manual ou importado do PDF da matriz (ver frontend/src/lib/curriculumMatrixImport.ts).
// `kind` distingue 3 formatos de linha, todos na mesma tabela:
//   - "obrigatoria": disciplina normal, completa via `status`.
//   - "eletiva": vaga de eletiva (ex: "Eletiva 1") — `code` fica null até o
//     usuário escolher qual das eletivas do catálogo (cacheado no localStorage
//     na importação, não persistido — ver curriculumMatrixImport.ts) preenche
//     a vaga; `name` continua "Eletiva N" mesmo depois de escolhida, pra servir
//     de identificador estável entre reimportações da matriz.
//   - "atividade": exigência medida em horas acumuladas (estágio, atividades
//     complementares, extensão), não em "cursando/concluída" binário — usa
//     `completedHours` (progresso) contra `workload` (meta), com `status`
//     derivado automaticamente no client a partir dessa razão.
export const curriculumSubjects = pgTable("curriculum_subjects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code"),
  workload: integer("workload").notNull(),
  suggestedPeriod: integer("suggested_period"),
  status: text("status").notNull().default("pendente"), // "pendente" | "cursando" | "concluida"
  kind: text("kind").notNull().default("obrigatoria"), // "obrigatoria" | "eletiva" | "atividade"
  completedHours: integer("completed_hours").notNull().default(0),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
}, (t) => [
  index("curriculum_subjects_user_id_idx").on(t.userId),
]);

// Requerimentos acadêmicos — pedidos formais feitos à faculdade (quebra de
// pré-requisito, ajuste de matrícula, trancamento, aproveitamento de
// disciplina), cada um com seu próprio ciclo de vida até ser aprovado ou
// recusado. subjectId é opcional: nem todo requerimento se refere a uma
// matéria específica (ex: trancamento de período inteiro).
export const academicRequests = pgTable("academic_requests", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(), // "prerequisite_waiver" | "enrollment_adjustment" | "leave_of_absence" | "credit_recognition"
  subjectId: integer("subject_id").references(() => subjects.id),
  requirements: text("requirements"), // texto livre: o que precisa apresentar/cumprir pra ter chance de aprovação
  status: text("status").notNull().default("pendente"), // "pendente" | "aprovado" | "recusado"
  submittedAt: date("submitted_at").notNull(),
  resolvedAt: date("resolved_at"),
  rejectionReason: text("rejection_reason"), // só preenchido quando status = "recusado"
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
}, (t) => [
  index("academic_requests_user_id_subject_id_idx").on(t.userId, t.subjectId),
  index("academic_requests_subject_id_idx").on(t.subjectId),
]);
