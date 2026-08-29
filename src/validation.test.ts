import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { eq } from "drizzle-orm";
import { db } from "./db/index.js";
import * as schema from "./db/schema.js";

const { app } = await import("./app.js");

// Um usuário só pra este arquivo, apagado no fim (o Neon é compartilhado
// entre as sessões, então a limpeza é pelo email exato, nunca por LIKE).
const email = `teste-validacao-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
const agent = request.agent(app);

let periodId = 0;
let professorId = 0;
let subjectId = 0;

beforeAll(async () => {
  await agent.post("/api/auth/sign-up/email").send({ email, password: "senha12345", name: "Teste Validação" });

  const [period] = (await agent.post("/periods").send({ label: "2026/1", startDate: "2026-02-01", endDate: "2026-07-31" })).body;
  periodId = period.id;

  const [professor] = (await agent.post("/professors").send({ name: "Fulano", email: "fulano@example.com" })).body;
  professorId = professor.id;

  const [subject] = (await agent.post("/subjects").send({ name: "Cálculo", code: null, workload: 60, periodId, professorId })).body;
  subjectId = subject.id;
});

afterAll(async () => {
  await db.delete(schema.users).where(eq(schema.users.email, email));
});

describe("tipo errado vira 400, não 500", () => {
  it("recusa weight não numérico em POST /assignments", async () => {
    const res = await agent
      .post("/assignments")
      .send({ subjectId, title: "Lista 1", dueDate: "2026-03-10", weight: "abc", grade: null });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("weight deve ser um número");
  });

  it("recusa weight não numérico em POST /exams", async () => {
    const res = await agent
      .post("/exams")
      .send({ subjectId, title: "P1", date: "2026-04-10", weight: {}, grade: null });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("weight deve ser um número");
  });

  it("recusa grade não numérica em PUT /assignments/:id", async () => {
    const [created] = (
      await agent.post("/assignments").send({ subjectId, title: "Lista 2", dueDate: "2026-03-11", weight: 2, grade: null })
    ).body;

    const res = await agent
      .put(`/assignments/${created.id}`)
      .send({ subjectId, title: "Lista 2", dueDate: "2026-03-11", weight: 2, grade: "dez" });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("grade deve ser um número");
  });

  it("recusa workload fracionário em POST /subjects", async () => {
    const res = await agent.post("/subjects").send({ name: "Física", workload: 60.5, periodId, professorId });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("workload deve ser um número inteiro");
  });

  it("recusa absences negativo em PATCH /subjects/:id/absences", async () => {
    const res = await agent.patch(`/subjects/${subjectId}/absences`).send({ absences: -1 });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("absences não pode ser negativo");
  });
});

describe("campo obrigatório ausente ou vazio", () => {
  it("recusa title vazio", async () => {
    const res = await agent.post("/assignments").send({ subjectId, title: "   ", dueDate: "2026-03-10", weight: 1 });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("title não pode ficar vazio");
  });

  it("recusa subjectId ausente", async () => {
    const res = await agent.post("/exams").send({ title: "P2", date: "2026-04-10", weight: 1 });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("subjectId é obrigatório");
  });

  it("recusa data fora do formato AAAA-MM-DD", async () => {
    const res = await agent.post("/periods").send({ label: "2026/2", startDate: "01/08/2026", endDate: "2026-12-31" });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("startDate deve estar no formato AAAA-MM-DD");
  });
});

describe("listas fechadas", () => {
  it("recusa source desconhecido em POST /study-sessions", async () => {
    const res = await agent.post("/study-sessions").send({ subjectId, date: "2026-03-10", durationMinutes: 25, source: "outro" });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("source deve ser um de: pomodoro, manual");
  });

  it("recusa type desconhecido em POST /academic-requests", async () => {
    const res = await agent.post("/academic-requests").send({ type: "outro", submittedAt: "2026-03-10" });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain("type deve ser um de: prerequisite_waiver");
  });
});

describe("payloads de importação", () => {
  it("recusa lista de ofertas vazia", async () => {
    const res = await agent.post("/offerings/import").send({ offerings: [] });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("offerings não pode ficar vazio");
  });

  it("recusa oferta sem turma", async () => {
    const res = await agent
      .post("/offerings/import")
      .send({ offerings: [{ subjectCode: "CEA050", subjectName: "Cálculo", turma: "", schedules: [] }] });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("turma não pode ficar vazio");
  });

  it("recusa aula sem lessonNumber quando o formato é per_aula", async () => {
    const res = await agent
      .post("/syllabus-entries/import")
      .send({ subjectId, format: "per_aula", entries: [{ content: "Aula 1", date: "2026-03-10", lessonNumber: null }] });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("cada aula precisa de lessonNumber e date");
  });
});

describe("o que já funcionava continua funcionando", () => {
  it("cria e atualiza uma atividade com payload válido", async () => {
    const [created] = (
      await agent.post("/assignments").send({ subjectId, title: "Trabalho", dueDate: "2026-05-10", weight: 3, grade: null })
    ).body;
    expect(created.weight).toBe(3);
    expect(created.grade).toBeNull();

    const [updated] = (
      await agent
        .put(`/assignments/${created.id}`)
        .send({ subjectId, title: "Trabalho", dueDate: "2026-05-10", weight: 3, grade: 8.5 })
    ).body;
    expect(updated.grade).toBe(8.5);
  });

  it("aceita subjectId como string numérica (value cru de <select>)", async () => {
    const res = await agent
      .post("/exams")
      .send({ subjectId: String(subjectId), title: "P3", date: "2026-06-10", weight: 1, grade: null });

    expect(res.status).toBe(200);
    expect(res.body[0].subjectId).toBe(subjectId);
  });

  it("normaliza texto opcional vazio para null", async () => {
    const res = await agent.post("/schedules").send({ subjectId, weekday: "seg", startTime: "07:30", endTime: "09:10", room: "" });

    expect(res.status).toBe(200);
    expect(res.body[0].room).toBeNull();
  });

  it("PATCH /auth/me continua parcial: mandar só uma aba não apaga a outra", async () => {
    await agent.patch("/auth/me").send({ institution: "UFOP", course: "Sistemas de Informação" });
    await agent.patch("/auth/me").send({ linkedinUrl: "https://linkedin.com/in/teste" });

    const me = await agent.get("/auth/me");
    expect(me.body.institution).toBe("UFOP");
    expect(me.body.name).toBe("Teste Validação");
    expect(me.body.linkedinUrl).toBe("https://linkedin.com/in/teste");
  });
});
