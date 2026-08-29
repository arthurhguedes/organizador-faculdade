import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { eq } from "drizzle-orm";
import { db } from "./db/index.js";
import * as schema from "./db/schema.js";

const { app } = await import("./app.js");

// Este arquivo existe por causa da factory de router CRUD: as nove rotas que
// ela passou a gerar tinham o comportamento definido só pelo código repetido
// em cada arquivo, sem nenhum teste. Aqui o contrato de cada uma fica escrito
// — formato da resposta, mensagens de 404 e as exceções que continuam à mão —
// pra que a migração fosse verificável em vez de "compilou, deve estar certo".
//
// Um usuário só pra este arquivo, apagado no fim (o Neon é compartilhado
// entre as sessões, então a limpeza é pelo email exato, nunca por LIKE).
const email = `teste-crud-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
const agent = request.agent(app);

let periodId = 0;
let professorId = 0;
let subjectId = 0;

beforeAll(async () => {
  await agent.post("/api/auth/sign-up/email").send({ email, password: "senha12345", name: "Teste CRUD" });

  const [period] = (
    await agent.post("/periods").send({ label: "2026/1", startDate: "2026-02-01", endDate: "2026-07-31" })
  ).body;
  periodId = period.id;

  const [professor] = (await agent.post("/professors").send({ name: "Fulano", email: "fulano@example.com" })).body;
  professorId = professor.id;

  const [subject] = (
    await agent.post("/subjects").send({ name: "Cálculo", code: null, workload: 60, periodId, professorId })
  ).body;
  subjectId = subject.id;
});

afterAll(async () => {
  await db.delete(schema.users).where(eq(schema.users.email, email));
});

/**
 * Cada entidade migrada, com um payload de criação, uma alteração e o texto
 * exato do 404 — que a factory deriva do nome e do gênero, então um erro de
 * concordância ("Prova não encontrado") aparece aqui.
 */
type CrudCase = {
  path: string;
  create: () => Record<string, unknown>;
  update: () => Record<string, unknown>;
  /** Campo conferido depois do PUT, pra garantir que o update pegou. */
  updatedField: string;
  notFound: string;
  removed: string;
  hasGetById: boolean;
};

const cases: CrudCase[] = [
  {
    path: "/periods",
    create: () => ({ label: "2025/2", startDate: "2025-08-01", endDate: "2025-12-20" }),
    update: () => ({ label: "2025/2 (retificado)", startDate: "2025-08-01", endDate: "2025-12-20" }),
    updatedField: "label",
    notFound: "Período não encontrado",
    removed: "Período removido com sucesso",
    hasGetById: true,
  },
  {
    path: "/professors",
    create: () => ({ name: "Ciclana", email: "ciclana@example.com" }),
    update: () => ({ name: "Ciclana de Tal", email: "ciclana@example.com" }),
    updatedField: "name",
    notFound: "Professor não encontrado",
    removed: "Professor removido com sucesso",
    hasGetById: true,
  },
  {
    path: "/schedules",
    create: () => ({ subjectId, weekday: "segunda", startTime: "08:00", endTime: "10:00", room: "S101" }),
    update: () => ({ subjectId, weekday: "terça", startTime: "08:00", endTime: "10:00", room: "S102" }),
    updatedField: "weekday",
    notFound: "Horário não encontrado",
    removed: "Horário removido com sucesso",
    hasGetById: true,
  },
  {
    path: "/assignments",
    create: () => ({ subjectId, title: "Lista 1", dueDate: "2026-03-10", weight: 2, grade: null }),
    update: () => ({ subjectId, title: "Lista 1 (revisada)", dueDate: "2026-03-12", weight: 2, grade: 8.5 }),
    updatedField: "title",
    notFound: "Atividade não encontrada",
    removed: "Atividade removida com sucesso",
    hasGetById: true,
  },
  {
    path: "/exams",
    create: () => ({ subjectId, title: "P1", date: "2026-04-10", weight: 3, grade: null }),
    update: () => ({ subjectId, title: "P1 (adiada)", date: "2026-04-17", weight: 3, grade: null }),
    updatedField: "title",
    notFound: "Prova não encontrada",
    removed: "Prova removida com sucesso",
    hasGetById: true,
  },
  {
    path: "/daily-notes",
    create: () => ({ date: "2026-03-01", content: "revisar integrais", done: false }),
    update: () => ({ date: "2026-03-01", content: "revisar integrais", done: true }),
    updatedField: "done",
    notFound: "Anotação não encontrada",
    removed: "Anotação removida com sucesso",
    hasGetById: false,
  },
  {
    path: "/study-sessions",
    create: () => ({ subjectId, topic: "limites", date: "2026-03-02", durationMinutes: 25, source: "pomodoro" }),
    update: () => ({ subjectId, topic: "derivadas", date: "2026-03-02", durationMinutes: 50, source: "manual" }),
    updatedField: "topic",
    notFound: "Sessão de estudo não encontrada",
    removed: "Sessão de estudo removida com sucesso",
    hasGetById: false,
  },
  {
    path: "/curriculum-subjects",
    create: () => ({
      name: "Álgebra Linear",
      code: "MTM101",
      workload: 60,
      suggestedPeriod: 2,
      status: "pendente",
      kind: "obrigatoria",
      completedHours: 0,
    }),
    update: () => ({
      name: "Álgebra Linear",
      code: "MTM101",
      workload: 60,
      suggestedPeriod: 2,
      status: "cursando",
      kind: "obrigatoria",
      completedHours: 30,
    }),
    updatedField: "status",
    notFound: "Matéria da matriz não encontrada",
    removed: "Matéria da matriz removida com sucesso",
    hasGetById: true,
  },
  {
    path: "/academic-requests",
    create: () => ({
      type: "prerequisite_waiver",
      subjectId,
      requirements: "histórico + ementa",
      status: "pendente",
      submittedAt: "2026-03-05",
      resolvedAt: null,
      rejectionReason: null,
    }),
    update: () => ({
      type: "prerequisite_waiver",
      subjectId,
      requirements: "histórico + ementa",
      status: "aprovado",
      submittedAt: "2026-03-05",
      resolvedAt: "2026-03-20",
      rejectionReason: null,
    }),
    updatedField: "status",
    notFound: "Requerimento não encontrado",
    removed: "Requerimento removido com sucesso",
    hasGetById: true,
  },
];

describe.each(cases)("CRUD de $path", (entity) => {
  it("cria, lista, atualiza e remove", async () => {
    // O front espera **array** no POST e no PUT (`const [novo] = res.body`),
    // não o objeto solto — é o detalhe mais fácil de quebrar num refactor.
    const created = await agent.post(entity.path).send(entity.create());
    expect(created.status).toBe(200);
    expect(Array.isArray(created.body)).toBe(true);
    const row = created.body[0];
    expect(row.id).toBeTypeOf("number");

    const listed = await agent.get(entity.path);
    expect(listed.status).toBe(200);
    expect(listed.body.some((item: { id: number }) => item.id === row.id)).toBe(true);

    if (entity.hasGetById) {
      const one = await agent.get(`${entity.path}/${row.id}`);
      expect(one.status).toBe(200);
      // Aqui, ao contrário do POST/PUT, a resposta é o objeto direto.
      expect(one.body.id).toBe(row.id);
    }

    const changes = entity.update();
    const updated = await agent.put(`${entity.path}/${row.id}`).send(changes);
    expect(updated.status).toBe(200);
    expect(Array.isArray(updated.body)).toBe(true);
    expect(updated.body[0][entity.updatedField]).toStrictEqual(changes[entity.updatedField]);

    const removed = await agent.delete(`${entity.path}/${row.id}`);
    expect(removed.status).toBe(200);
    expect(removed.body.message).toBe(entity.removed);

    const afterDelete = await agent.get(entity.path);
    expect(afterDelete.body.some((item: { id: number }) => item.id === row.id)).toBe(false);
  });

  it("responde 404 com a mensagem da entidade em id inexistente", async () => {
    const missing = 987654321;

    const put = await agent.put(`${entity.path}/${missing}`).send(entity.update());
    expect(put.status).toBe(404);
    expect(put.body.message).toBe(entity.notFound);

    const del = await agent.delete(`${entity.path}/${missing}`);
    expect(del.status).toBe(404);
    expect(del.body.message).toBe(entity.notFound);

    if (entity.hasGetById) {
      const get = await agent.get(`${entity.path}/${missing}`);
      expect(get.status).toBe(404);
      expect(get.body.message).toBe(entity.notFound);
    }
  });

  it("responde 400 em id não numérico", async () => {
    const del = await agent.delete(`${entity.path}/abc`);
    expect(del.status).toBe(400);
    expect(del.body.message).toBe("id inválido");
  });
});

describe("posse da matéria continua checada", () => {
  it("recusa subjectId inexistente com 400, não 500", async () => {
    const res = await agent
      .post("/assignments")
      .send({ subjectId: 987654321, title: "Lista X", dueDate: "2026-03-10", weight: 1, grade: null });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("subjectId não existe");
  });

  it("aceita sessão de estudo sem matéria (subjectId é opcional ali)", async () => {
    const res = await agent
      .post("/study-sessions")
      .send({ subjectId: null, topic: "leitura solta", date: "2026-03-03", durationMinutes: 30, source: "manual" });

    expect(res.status).toBe(200);
    expect(res.body[0].subjectId).toBeNull();

    await agent.delete(`/study-sessions/${res.body[0].id}`);
  });
});

describe("exceções que a factory não engoliu", () => {
  it("período com matéria vinculada não é removido", async () => {
    const res = await agent.delete(`/periods/${periodId}`);

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Não é possível remover: existem matérias vinculadas a este período");
  });

  it("remover professor leva junto as matérias dele", async () => {
    const [professor] = (await agent.post("/professors").send({ name: "Beltrano", email: "beltrano@example.com" }))
      .body;
    const [subject] = (
      await agent
        .post("/subjects")
        .send({ name: "Física", code: null, workload: 60, periodId, professorId: professor.id })
    ).body;

    const removed = await agent.delete(`/professors/${professor.id}`);
    expect(removed.status).toBe(200);

    const subjectAfter = await agent.get(`/subjects/${subject.id}`);
    expect(subjectAfter.status).toBe(404);
    // Quatro idas ao Neon numa transação: não cabe no timeout padrão de 5s.
  }, 30_000);
});
