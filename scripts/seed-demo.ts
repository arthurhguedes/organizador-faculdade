// Script one-off pra criar uma conta demo com dados 100% fictícios em todas
// as tabelas, usada só pra gravação/demonstração do app. Idempotente: apaga
// (cascade) e recria o usuário demo toda vez que roda.
//
// Uso: npx tsx scripts/seed-demo.ts
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "../src/db/index.js";
import * as schema from "../src/db/schema.js";

const DEMO_EMAIL = "demo@notary.app";
const DEMO_PASSWORD = "DemoNotary2026";
const DEMO_USERNAME = "beatriz_demo";

async function main() {
  const existing = await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.email, DEMO_EMAIL));
  if (existing.length > 0) {
    await db.delete(schema.users).where(eq(schema.users.id, existing[0]!.id));
    console.log("Usuário demo anterior removido (cascade limpou os dados dele).");
  }

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  const [user] = await db
    .insert(schema.users)
    .values({
      name: "Beatriz Nogueira Santos",
      email: DEMO_EMAIL,
      emailVerified: true,
      institution: "Universidade Federal de Ouro Preto (UFOP)",
      course: "Engenharia de Computação",
      birthDate: "2003-04-12",
      linkedinUrl: "https://linkedin.com/in/beatriz-nogueira-demo",
      githubUrl: "https://github.com/beatriz-demo",
      username: DEMO_USERNAME,
      displayUsername: "Beatriz_Demo",
    })
    .returning();
  const userId = user!.id;

  await db.insert(schema.accounts).values({
    userId,
    accountId: String(userId),
    providerId: "credential",
    password: passwordHash,
  });

  // ---------------------------------------------------------------------
  // Períodos
  // ---------------------------------------------------------------------
  const [periodA] = await db
    .insert(schema.periods)
    .values({ label: "2025/2", startDate: "2025-08-04", endDate: "2025-12-19", userId })
    .returning();
  const [periodB] = await db
    .insert(schema.periods)
    .values({ label: "2026/2", startDate: "2026-08-03", endDate: "2026-12-18", userId })
    .returning();

  // ---------------------------------------------------------------------
  // Professores
  // ---------------------------------------------------------------------
  const professorNames = [
    ["Ricardo Almeida", "ricardo.almeida@ufop.edu.br"],
    ["Sandra Lima", "sandra.lima@ufop.edu.br"],
    ["Marcos Vinícius Prado", "marcos.prado@ufop.edu.br"],
    ["Juliana Ferreira", "juliana.ferreira@ufop.edu.br"],
    ["Fernanda Costa", "fernanda.costa@ufop.edu.br"],
    ["André Salgado", "andre.salgado@ufop.edu.br"],
  ] as const;
  const prof: Record<string, number> = {};
  for (const [name, email] of professorNames) {
    const [row] = await db.insert(schema.professors).values({ name, email, userId }).returning();
    prof[name] = row!.id;
  }

  // ---------------------------------------------------------------------
  // Matérias — Período A (2025/2, concluído)
  // ---------------------------------------------------------------------
  type SubjectSeed = { name: string; code: string; workload: number; professor: string; absences: number };

  const subjectsA: SubjectSeed[] = [
    { name: "Cálculo III", code: "CEA050", workload: 60, professor: "Ricardo Almeida", absences: 2 },
    { name: "Física III", code: "CEF120", workload: 60, professor: "Sandra Lima", absences: 4 },
    { name: "Estrutura de Dados", code: "CSI220", workload: 80, professor: "Marcos Vinícius Prado", absences: 0 },
    { name: "Probabilidade e Estatística", code: "CEE080", workload: 60, professor: "Juliana Ferreira", absences: 6 },
    { name: "Eletromagnetismo", code: "CEF150", workload: 60, professor: "Ricardo Almeida", absences: 3 },
  ];

  const subj: Record<string, number> = {};
  for (const s of subjectsA) {
    const [row] = await db
      .insert(schema.subjects)
      .values({
        name: s.name,
        code: s.code,
        workload: s.workload,
        periodId: periodA!.id,
        professorId: prof[s.professor]!,
        absences: s.absences,
        userId,
      })
      .returning();
    subj[s.name] = row!.id;
  }

  const schedulesA: [string, string, string, string][] = [
    ["Cálculo III", "segunda", "08:00", "10:00"],
    ["Física III", "segunda", "10:00", "12:00"],
    ["Estrutura de Dados", "terça", "08:00", "10:00"],
    ["Probabilidade e Estatística", "terça", "14:00", "16:00"],
    ["Cálculo III", "quarta", "08:00", "10:00"],
    ["Eletromagnetismo", "quarta", "10:00", "12:00"],
    ["Estrutura de Dados", "quinta", "08:00", "10:00"],
    ["Probabilidade e Estatística", "quinta", "14:00", "16:00"],
    ["Física III", "sexta", "10:00", "12:00"],
    ["Eletromagnetismo", "sexta", "14:00", "16:00"],
  ];
  for (const [name, weekday, startTime, endTime] of schedulesA) {
    await db.insert(schema.schedules).values({ subjectId: subj[name]!, weekday, startTime, endTime, userId });
  }

  // Atividades e provas — todas já corrigidas (período concluído).
  const assignmentsA: [string, string, string, number, number][] = [
    ["Cálculo III", "Lista de exercícios 1 — Integrais múltiplas", "2025-09-12", 2, 8.5],
    ["Cálculo III", "Lista de exercícios 2 — Séries", "2025-10-24", 2, 7.0],
    ["Física III", "Relatório de laboratório — Ondas eletromagnéticas", "2025-09-20", 2, 9.0],
    ["Física III", "Lista de exercícios — Óptica", "2025-11-05", 2, 8.0],
    ["Estrutura de Dados", "Trabalho prático 1 — Árvores balanceadas", "2025-09-15", 2, 9.5],
    ["Estrutura de Dados", "Trabalho prático 2 — Grafos e busca", "2025-11-10", 2, 9.0],
    ["Probabilidade e Estatística", "Lista de exercícios — Distribuições", "2025-09-28", 2, 6.5],
    ["Probabilidade e Estatística", "Trabalho — Inferência estatística", "2025-11-14", 2, 7.5],
    ["Eletromagnetismo", "Lista de exercícios — Lei de Gauss", "2025-09-22", 2, 8.0],
    ["Eletromagnetismo", "Relatório — Indução eletromagnética", "2025-11-08", 2, 8.5],
  ];
  for (const [name, title, dueDate, weight, grade] of assignmentsA) {
    await db.insert(schema.assignments).values({ subjectId: subj[name]!, title, dueDate, weight, grade, userId });
  }

  const examsA: [string, string, string, number, number][] = [
    ["Cálculo III", "Prova 1", "2025-09-30", 3, 7.5],
    ["Cálculo III", "Prova 2", "2025-12-05", 3, 8.0],
    ["Física III", "Prova 1", "2025-10-08", 3, 8.5],
    ["Física III", "Prova 2", "2025-12-08", 3, 9.0],
    ["Estrutura de Dados", "Prova 1", "2025-10-01", 3, 9.0],
    ["Estrutura de Dados", "Prova 2", "2025-12-03", 3, 9.5],
    ["Probabilidade e Estatística", "Prova 1", "2025-10-15", 3, 6.0],
    ["Probabilidade e Estatística", "Prova 2", "2025-12-10", 3, 7.0],
    ["Eletromagnetismo", "Prova 1", "2025-10-10", 3, 7.5],
    ["Eletromagnetismo", "Prova 2", "2025-12-12", 3, 8.5],
  ];
  for (const [name, title, date, weight, grade] of examsA) {
    await db.insert(schema.exams).values({ subjectId: subj[name]!, title, date, weight, grade, userId });
  }

  // ---------------------------------------------------------------------
  // Matérias — Período B (2026/2, em andamento — hoje é 2026-08-20)
  // ---------------------------------------------------------------------
  const subjectsB: SubjectSeed[] = [
    { name: "Algoritmos em Grafos", code: "CSI310", workload: 60, professor: "Marcos Vinícius Prado", absences: 1 },
    { name: "Sistemas Operacionais", code: "CSI280", workload: 80, professor: "Fernanda Costa", absences: 2 },
    { name: "Banco de Dados", code: "CSI260", workload: 60, professor: "Juliana Ferreira", absences: 0 },
    { name: "Engenharia de Software", code: "CSI340", workload: 60, professor: "André Salgado", absences: 1 },
    { name: "Redes de Computadores", code: "CSI300", workload: 60, professor: "Fernanda Costa", absences: 3 },
  ];
  for (const s of subjectsB) {
    const [row] = await db
      .insert(schema.subjects)
      .values({
        name: s.name,
        code: s.code,
        workload: s.workload,
        periodId: periodB!.id,
        professorId: prof[s.professor]!,
        absences: s.absences,
        userId,
      })
      .returning();
    subj[s.name] = row!.id;
  }

  const schedulesB: [string, string, string, string][] = [
    ["Sistemas Operacionais", "segunda", "08:00", "10:00"],
    ["Banco de Dados", "segunda", "10:00", "12:00"],
    ["Algoritmos em Grafos", "terça", "08:00", "10:00"],
    ["Redes de Computadores", "terça", "14:00", "16:00"],
    ["Sistemas Operacionais", "quarta", "08:00", "10:00"],
    ["Engenharia de Software", "quarta", "10:00", "12:00"],
    ["Algoritmos em Grafos", "quinta", "08:00", "10:00"],
    ["Redes de Computadores", "quinta", "14:00", "16:00"],
    ["Banco de Dados", "sexta", "10:00", "12:00"],
    ["Engenharia de Software", "sexta", "14:00", "16:00"],
  ];
  for (const [name, weekday, startTime, endTime] of schedulesB) {
    await db.insert(schema.schedules).values({ subjectId: subj[name]!, weekday, startTime, endTime, userId });
  }

  // Semestre recém-começado: 1 atividade já corrigida + 1 futura, 1 prova
  // futura por matéria (mostra tanto notas lançadas quanto "próximas" no
  // Dashboard/notificações).
  const assignmentsB: [string, string, string, number, number | null][] = [
    ["Algoritmos em Grafos", "Quiz 1 — Representação de grafos", "2026-08-14", 2, 8.0],
    ["Algoritmos em Grafos", "Trabalho — Algoritmo de Dijkstra", "2026-09-18", 3, null],
    ["Sistemas Operacionais", "Quiz 1 — Processos e threads", "2026-08-13", 2, 7.5],
    ["Sistemas Operacionais", "Trabalho prático — Escalonador simulado", "2026-09-25", 3, null],
    ["Banco de Dados", "Quiz 1 — Modelagem ER", "2026-08-17", 2, 9.0],
    ["Banco de Dados", "Trabalho — Normalização", "2026-09-20", 3, null],
    ["Engenharia de Software", "Quiz 1 — Metodologias ágeis", "2026-08-15", 2, 8.5],
    ["Engenharia de Software", "Trabalho — Levantamento de requisitos", "2026-09-22", 3, null],
    ["Redes de Computadores", "Quiz 1 — Modelo OSI", "2026-08-14", 2, 6.5],
    ["Redes de Computadores", "Trabalho — Configuração de sub-redes", "2026-09-19", 3, null],
  ];
  for (const [name, title, dueDate, weight, grade] of assignmentsB) {
    await db.insert(schema.assignments).values({ subjectId: subj[name]!, title, dueDate, weight, grade, userId });
  }

  const examsB: [string, string, string, number, number | null][] = [
    ["Algoritmos em Grafos", "Prova 1", "2026-10-06", 5, null],
    ["Sistemas Operacionais", "Prova 1", "2026-10-08", 5, null],
    ["Banco de Dados", "Prova 1", "2026-10-09", 5, null],
    ["Engenharia de Software", "Prova 1", "2026-10-13", 5, null],
    ["Redes de Computadores", "Prova 1", "2026-10-15", 5, null],
  ];
  for (const [name, title, date, weight, grade] of examsB) {
    await db.insert(schema.exams).values({ subjectId: subj[name]!, title, date, weight, grade, userId });
  }

  // ---------------------------------------------------------------------
  // Plano de ensino — Sistemas Operacionais (algumas aulas já dadas, outras
  // futuras; aparecem no Calendário como eventos "lesson")
  // ---------------------------------------------------------------------
  const syllabusSO: [number, "T" | "P", string, string][] = [
    [1, "T", "2026-08-03", "Apresentação da disciplina e introdução a sistemas operacionais"],
    [2, "T", "2026-08-05", "Estrutura de sistemas operacionais e chamadas de sistema"],
    [3, "T", "2026-08-10", "Processos: estados, PCB e troca de contexto"],
    [4, "P", "2026-08-12", "Laboratório — criação de processos em C (fork/exec)"],
    [5, "T", "2026-08-17", "Threads e modelos de multithreading"],
    [6, "T", "2026-08-19", "Escalonamento de CPU: FCFS, SJF, Round Robin"],
    [7, "T", "2026-08-24", "Sincronização: seções críticas e semáforos"],
    [8, "P", "2026-08-26", "Laboratório — produtor-consumidor com semáforos"],
    [9, "T", "2026-08-31", "Deadlocks: condições e prevenção"],
    [10, "T", "2026-09-02", "Gerência de memória: paginação e segmentação"],
  ];
  for (const [lessonNumber, kind, date, content] of syllabusSO) {
    await db.insert(schema.syllabusEntries).values({ subjectId: subj["Sistemas Operacionais"]!, lessonNumber, kind, date, content, userId });
  }

  // ---------------------------------------------------------------------
  // Sessões de estudo (últimos ~14 dias, pro gráfico de tendência) +
  // algumas sem matéria vinculada (demonstra o fluxo de "vincular depois")
  // ---------------------------------------------------------------------
  const studySessionsSeed: [string, string | null, string | null, number, "pomodoro" | "manual"][] = [
    ["2026-08-07", "Algoritmos em Grafos", "BFS e DFS", 50, "pomodoro"],
    ["2026-08-08", "Sistemas Operacionais", "Estados de processo", 25, "pomodoro"],
    ["2026-08-09", "Banco de Dados", "Modelo ER", 75, "manual"],
    ["2026-08-10", "Sistemas Operacionais", "Troca de contexto", 50, "pomodoro"],
    ["2026-08-11", null, "Revisão geral da semana", 30, "manual"],
    ["2026-08-12", "Engenharia de Software", "Scrum e Kanban", 25, "pomodoro"],
    ["2026-08-13", "Redes de Computadores", "Modelo OSI", 50, "pomodoro"],
    ["2026-08-13", "Algoritmos em Grafos", "Dijkstra", 25, "pomodoro"],
    ["2026-08-14", "Banco de Dados", "Normalização (1FN, 2FN, 3FN)", 50, "manual"],
    ["2026-08-15", null, "Organização de anotações da semana", 20, "manual"],
    ["2026-08-16", "Sistemas Operacionais", "Threads e concorrência", 75, "pomodoro"],
    ["2026-08-17", "Engenharia de Software", "Levantamento de requisitos", 50, "pomodoro"],
    ["2026-08-18", "Redes de Computadores", "Sub-redes e máscaras", 50, "pomodoro"],
    ["2026-08-19", "Sistemas Operacionais", "Escalonamento de CPU", 100, "pomodoro"],
    ["2026-08-20", "Algoritmos em Grafos", "Preparação pro quiz", 25, "pomodoro"],
  ];
  for (const [date, subjectName, topic, durationMinutes, source] of studySessionsSeed) {
    await db.insert(schema.studySessions).values({
      subjectId: subjectName ? subj[subjectName]! : null,
      topic,
      date,
      durationMinutes,
      source,
      userId,
    });
  }

  // ---------------------------------------------------------------------
  // Anotações diárias (checklist)
  // ---------------------------------------------------------------------
  const dailyNotesSeed: [string, string, boolean][] = [
    ["2026-08-20", "Revisar slides de SO cap. 6 (escalonamento)", false],
    ["2026-08-20", "Terminar lista de exercícios de Grafos", false],
    ["2026-08-20", "Comprar caderno novo", false],
    ["2026-08-19", "Ler artigo sobre índices B-tree", true],
    ["2026-08-18", "Montar resumo pra prova de Redes", true],
    ["2026-08-17", "Enviar trabalho de Engenharia de Software", true],
    ["2026-08-15", "Organizar anotações da semana", true],
  ];
  for (const [date, content, done] of dailyNotesSeed) {
    await db.insert(schema.dailyNotes).values({ date, content, done, userId });
  }

  // ---------------------------------------------------------------------
  // Matriz curricular (cadastro manual, universo do curso)
  // ---------------------------------------------------------------------
  type CurriculumSeed = { name: string; code: string; workload: number; suggestedPeriod: number; status: "pendente" | "cursando" | "concluida" };
  const curriculum: CurriculumSeed[] = [
    { name: "Cálculo I", code: "CEA010", workload: 60, suggestedPeriod: 1, status: "concluida" },
    { name: "Álgebra Linear", code: "CEA020", workload: 60, suggestedPeriod: 1, status: "concluida" },
    { name: "Física I", code: "CEF010", workload: 60, suggestedPeriod: 1, status: "concluida" },
    { name: "Algoritmos e Programação", code: "CSI100", workload: 80, suggestedPeriod: 1, status: "concluida" },
    { name: "Cálculo II", code: "CEA030", workload: 60, suggestedPeriod: 2, status: "concluida" },
    { name: "Física II", code: "CEF060", workload: 60, suggestedPeriod: 2, status: "concluida" },
    { name: "Circuitos Elétricos", code: "CEE040", workload: 60, suggestedPeriod: 2, status: "concluida" },
    { name: "Cálculo III", code: "CEA050", workload: 60, suggestedPeriod: 3, status: "concluida" },
    { name: "Física III", code: "CEF120", workload: 60, suggestedPeriod: 3, status: "concluida" },
    { name: "Estrutura de Dados", code: "CSI220", workload: 80, suggestedPeriod: 3, status: "concluida" },
    { name: "Probabilidade e Estatística", code: "CEE080", workload: 60, suggestedPeriod: 3, status: "concluida" },
    { name: "Eletromagnetismo", code: "CEF150", workload: 60, suggestedPeriod: 3, status: "concluida" },
    { name: "Arquitetura de Computadores", code: "CSI230", workload: 60, suggestedPeriod: 4, status: "pendente" },
    { name: "Algoritmos em Grafos", code: "CSI310", workload: 60, suggestedPeriod: 4, status: "cursando" },
    { name: "Sistemas Operacionais", code: "CSI280", workload: 80, suggestedPeriod: 4, status: "cursando" },
    { name: "Banco de Dados", code: "CSI260", workload: 60, suggestedPeriod: 4, status: "cursando" },
    { name: "Engenharia de Software", code: "CSI340", workload: 60, suggestedPeriod: 4, status: "cursando" },
    { name: "Redes de Computadores", code: "CSI300", workload: 60, suggestedPeriod: 4, status: "cursando" },
    { name: "Compiladores", code: "CSI350", workload: 60, suggestedPeriod: 5, status: "pendente" },
    { name: "Inteligência Artificial", code: "CSI360", workload: 60, suggestedPeriod: 5, status: "pendente" },
    { name: "Sistemas Distribuídos", code: "CSI370", workload: 60, suggestedPeriod: 6, status: "pendente" },
    { name: "Computação Gráfica", code: "CSI380", workload: 60, suggestedPeriod: 6, status: "pendente" },
    { name: "Trabalho de Conclusão de Curso I", code: "CSI490", workload: 30, suggestedPeriod: 7, status: "pendente" },
    { name: "Trabalho de Conclusão de Curso II", code: "CSI491", workload: 30, suggestedPeriod: 8, status: "pendente" },
  ];
  for (const c of curriculum) {
    await db.insert(schema.curriculumSubjects).values({ ...c, userId });
  }

  // ---------------------------------------------------------------------
  // Requerimentos acadêmicos
  // ---------------------------------------------------------------------
  await db.insert(schema.academicRequests).values([
    {
      type: "prerequisite_waiver",
      subjectId: subj["Algoritmos em Grafos"]!,
      requirements: "Comprovar aprovação em Estrutura de Dados equivalente na instituição anterior + histórico escolar",
      status: "aprovado",
      submittedAt: "2026-07-10",
      resolvedAt: "2026-07-25",
      rejectionReason: null,
      userId,
    },
    {
      type: "enrollment_adjustment",
      subjectId: null,
      requirements: "Ajuste de matrícula para incluir Redes de Computadores após período de trancamento parcial",
      status: "pendente",
      submittedAt: "2026-08-10",
      resolvedAt: null,
      rejectionReason: null,
      userId,
    },
    {
      type: "credit_recognition",
      subjectId: null,
      requirements: "Aproveitamento de Cálculo Numérico cursada em intercâmbio",
      status: "recusado",
      submittedAt: "2026-06-15",
      resolvedAt: "2026-07-02",
      rejectionReason: "Ementa da disciplina cursada na instituição de origem não cobre a carga horária mínima exigida.",
      userId,
    },
  ]);

  // ---------------------------------------------------------------------
  // Catálogo de ofertas da faculdade (pro montador de grade)
  // ---------------------------------------------------------------------
  type OfferingSeed = {
    professorName: string;
    subjectCode: string;
    subjectName: string;
    turma: string;
    curso: string;
    vagas: number;
    depto: string;
    workloadHours: number;
    theoryHours: number;
    practiceHours: number;
    schedules: [string, string, string, "T" | "P"][];
  };

  const offerings: OfferingSeed[] = [
    {
      professorName: "Marcos Vinícius Prado",
      subjectCode: "CSI310",
      subjectName: "Algoritmos em Grafos",
      turma: "01",
      curso: "Engenharia de Computação",
      vagas: 40,
      depto: "DECSI",
      workloadHours: 60,
      theoryHours: 60,
      practiceHours: 0,
      schedules: [
        ["terça", "08:00", "10:00", "T"],
        ["quinta", "08:00", "10:00", "T"],
      ],
    },
    {
      professorName: "Camila Duarte",
      subjectCode: "CSI310",
      subjectName: "Algoritmos em Grafos",
      turma: "02",
      curso: "Engenharia de Computação",
      vagas: 35,
      depto: "DECSI",
      workloadHours: 60,
      theoryHours: 60,
      practiceHours: 0,
      schedules: [
        ["segunda", "14:00", "16:00", "T"],
        ["quarta", "14:00", "16:00", "T"],
      ],
    },
    {
      professorName: "Fernanda Costa",
      subjectCode: "CSI280",
      subjectName: "Sistemas Operacionais",
      turma: "01",
      curso: "Engenharia de Computação",
      vagas: 40,
      depto: "DECSI",
      workloadHours: 80,
      theoryHours: 60,
      practiceHours: 20,
      schedules: [
        ["segunda", "08:00", "10:00", "T"],
        ["quarta", "08:00", "10:00", "T"],
      ],
    },
    {
      professorName: "André Salgado",
      subjectCode: "CSI280",
      subjectName: "Sistemas Operacionais",
      turma: "02",
      curso: "Engenharia de Computação",
      vagas: 40,
      depto: "DECSI",
      workloadHours: 80,
      theoryHours: 60,
      practiceHours: 20,
      schedules: [
        ["terça", "10:00", "12:00", "T"],
        ["quinta", "10:00", "12:00", "T"],
      ],
    },
    {
      professorName: "Juliana Ferreira",
      subjectCode: "CSI260",
      subjectName: "Banco de Dados",
      turma: "01",
      curso: "Engenharia de Computação",
      vagas: 45,
      depto: "DECSI",
      workloadHours: 60,
      theoryHours: 40,
      practiceHours: 20,
      schedules: [
        ["segunda", "10:00", "12:00", "T"],
        ["sexta", "10:00", "12:00", "P"],
      ],
    },
    {
      professorName: "André Salgado",
      subjectCode: "CSI340",
      subjectName: "Engenharia de Software",
      turma: "01",
      curso: "Engenharia de Computação",
      vagas: 45,
      depto: "DECSI",
      workloadHours: 60,
      theoryHours: 40,
      practiceHours: 20,
      schedules: [
        ["quarta", "10:00", "12:00", "T"],
        ["sexta", "14:00", "16:00", "P"],
      ],
    },
    {
      professorName: "Fernanda Costa",
      subjectCode: "CSI300",
      subjectName: "Redes de Computadores",
      turma: "01",
      curso: "Engenharia de Computação",
      vagas: 40,
      depto: "DECSI",
      workloadHours: 60,
      theoryHours: 60,
      practiceHours: 0,
      schedules: [
        ["terça", "14:00", "16:00", "T"],
        ["quinta", "14:00", "16:00", "T"],
      ],
    },
    {
      professorName: "Camila Duarte",
      subjectCode: "CSI350",
      subjectName: "Compiladores",
      turma: "01",
      curso: "Engenharia de Computação",
      vagas: 30,
      depto: "DECSI",
      workloadHours: 60,
      theoryHours: 60,
      practiceHours: 0,
      schedules: [
        ["segunda", "16:00", "18:00", "T"],
        ["quarta", "16:00", "18:00", "T"],
      ],
    },
    {
      professorName: "Marcos Vinícius Prado",
      subjectCode: "CSI360",
      subjectName: "Inteligência Artificial",
      turma: "01",
      curso: "Engenharia de Computação",
      vagas: 35,
      depto: "DECSI",
      workloadHours: 60,
      theoryHours: 60,
      practiceHours: 0,
      schedules: [
        ["terça", "16:00", "18:00", "T"],
        ["quinta", "16:00", "18:00", "T"],
      ],
    },
    {
      professorName: "Ricardo Almeida",
      subjectCode: "CEA060",
      subjectName: "Cálculo Numérico",
      turma: "01",
      curso: "Engenharia de Computação",
      vagas: 40,
      depto: "DEMAT",
      workloadHours: 60,
      theoryHours: 60,
      practiceHours: 0,
      schedules: [
        ["sexta", "08:00", "10:00", "T"],
      ],
    },
  ];

  for (const o of offerings) {
    const [row] = await db
      .insert(schema.courseOfferings)
      .values({
        professorName: o.professorName,
        subjectCode: o.subjectCode,
        subjectName: o.subjectName,
        turma: o.turma,
        curso: o.curso,
        vagas: o.vagas,
        depto: o.depto,
        workloadHours: o.workloadHours,
        theoryHours: o.theoryHours,
        practiceHours: o.practiceHours,
        userId,
      })
      .returning();
    for (const [weekday, startTime, endTime, kind] of o.schedules) {
      await db.insert(schema.offeringSchedules).values({ offeringId: row!.id, weekday, startTime, endTime, kind, userId });
    }
  }

  console.log("\nConta demo criada com sucesso.");
  console.log(`  email:    ${DEMO_EMAIL}`);
  console.log(`  usuário:  ${DEMO_USERNAME}`);
  console.log(`  senha:    ${DEMO_PASSWORD}`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
