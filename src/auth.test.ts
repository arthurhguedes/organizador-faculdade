import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "./db/index.js";
import * as schema from "./db/schema.js";

// Dummy só pra exercitar o wiring do provider Google (URL de autorização) sem
// precisar de credenciais reais — tem que ser setado antes do primeiro import
// de "./app.js", porque src/auth.ts decide incluir o provider no momento em
// que o módulo é avaliado.
process.env.GOOGLE_CLIENT_ID ||= "test-google-client-id";
process.env.GOOGLE_CLIENT_SECRET ||= "test-google-client-secret";

const { app } = await import("./app.js");

function uniqueEmail() {
  return `teste-auth-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
}

const createdEmails: string[] = [];

function trackedEmail() {
  const email = uniqueEmail();
  createdEmails.push(email);
  return email;
}

afterAll(async () => {
  for (const email of createdEmails) {
    await db.delete(schema.users).where(eq(schema.users.email, email));
  }
});

describe("cadastro e login por email/senha", () => {
  it("cadastra um usuário novo, cria sessão e /auth/me retorna o perfil", async () => {
    const email = trackedEmail();
    const agent = request.agent(app);

    const signUpRes = await agent
      .post("/api/auth/sign-up/email")
      .send({ email, password: "senha12345", name: "Teste" });
    expect(signUpRes.status).toBe(200);

    const meRes = await agent.get("/auth/me");
    expect(meRes.status).toBe(200);
    expect(meRes.body.email).toBe(email);
    expect(meRes.body.name).toBe("Teste");
  });

  it("rejeita cadastro com email já em uso", async () => {
    const email = trackedEmail();
    await request(app).post("/api/auth/sign-up/email").send({ email, password: "senha12345", name: "Teste" });

    const dupRes = await request(app)
      .post("/api/auth/sign-up/email")
      .send({ email, password: "outrasenha123", name: "Outro" });
    expect(dupRes.status).toBeGreaterThanOrEqual(400);
  });

  it("rejeita login com senha errada e não seta cookie", async () => {
    const email = trackedEmail();
    await request(app).post("/api/auth/sign-up/email").send({ email, password: "senha12345", name: "Teste" });

    const res = await request(app).post("/api/auth/sign-in/email").send({ email, password: "senhaerrada" });
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.headers["set-cookie"]).toBeUndefined();
  });

  it("loga com a senha correta e a sessão funciona em /auth/me", async () => {
    const email = trackedEmail();
    await request(app).post("/api/auth/sign-up/email").send({ email, password: "senha12345", name: "Teste" });

    const agent = request.agent(app);
    const loginRes = await agent.post("/api/auth/sign-in/email").send({ email, password: "senha12345" });
    expect(loginRes.status).toBe(200);

    const meRes = await agent.get("/auth/me");
    expect(meRes.status).toBe(200);
    expect(meRes.body.email).toBe(email);
  });

  it("logout invalida a sessão", async () => {
    const email = trackedEmail();
    const agent = request.agent(app);
    await agent.post("/api/auth/sign-up/email").send({ email, password: "senha12345", name: "Teste" });

    expect((await agent.get("/auth/me")).status).toBe(200);

    await agent.post("/api/auth/sign-out");
    expect((await agent.get("/auth/me")).status).toBe(401);
  });

  it("aceita login de conta migrada com hash bcrypt antigo (compatibilidade com a auth anterior)", async () => {
    const email = trackedEmail();
    const plainPassword = "senhaAntiga123";
    const legacyHash = bcrypt.hashSync(plainPassword, 10);

    const [user] = await db.insert(schema.users).values({ name: "Conta Legada", email }).returning();
    await db.insert(schema.accounts).values({
      userId: user!.id,
      accountId: String(user!.id),
      providerId: "credential",
      password: legacyHash,
    });

    const agent = request.agent(app);
    const loginRes = await agent.post("/api/auth/sign-in/email").send({ email, password: plainPassword });
    expect(loginRes.status).toBe(200);

    const meRes = await agent.get("/auth/me");
    expect(meRes.status).toBe(200);
    expect(meRes.body.email).toBe(email);
  });
});

describe("cadastro e login por username", () => {
  function uniqueUsername() {
    // Precisa caber no limite de 20 chars do plugin (minUsernameLength/maxUsernameLength em src/auth.ts).
    return `u${Date.now().toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`;
  }

  it("cadastra com username e loga com ele em vez do email", async () => {
    const email = trackedEmail();
    const uname = uniqueUsername();

    const signUpRes = await request(app)
      .post("/api/auth/sign-up/email")
      .send({ email, password: "senha12345", name: "Teste", username: uname });
    expect(signUpRes.status).toBe(200);

    const agent = request.agent(app);
    const loginRes = await agent.post("/api/auth/sign-in/username").send({ username: uname, password: "senha12345" });
    expect(loginRes.status).toBe(200);

    const meRes = await agent.get("/auth/me");
    expect(meRes.status).toBe(200);
    expect(meRes.body.email).toBe(email);
    expect(meRes.body.username).toBe(uname);
  });

  it("rejeita cadastro com username já em uso", async () => {
    const uname = uniqueUsername();
    await request(app)
      .post("/api/auth/sign-up/email")
      .send({ email: trackedEmail(), password: "senha12345", name: "Teste", username: uname });

    const dupRes = await request(app)
      .post("/api/auth/sign-up/email")
      .send({ email: trackedEmail(), password: "outrasenha123", name: "Outro", username: uname });
    expect(dupRes.status).toBeGreaterThanOrEqual(400);
  });

  it("normaliza o username pra minúsculo e continua logando com ele em minúsculo", async () => {
    const email = trackedEmail();
    const uname = uniqueUsername();

    await request(app)
      .post("/api/auth/sign-up/email")
      .send({ email, password: "senha12345", name: "Teste", username: uname.toUpperCase() });

    const agent = request.agent(app);
    const loginRes = await agent.post("/api/auth/sign-in/username").send({ username: uname, password: "senha12345" });
    expect(loginRes.status).toBe(200);
  });

  it("rejeita login com username errado e não seta cookie", async () => {
    const email = trackedEmail();
    const uname = uniqueUsername();
    await request(app)
      .post("/api/auth/sign-up/email")
      .send({ email, password: "senha12345", name: "Teste", username: uname });

    const res = await request(app)
      .post("/api/auth/sign-in/username")
      .send({ username: uname, password: "senhaerrada" });
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.headers["set-cookie"]).toBeUndefined();
  });
});

describe("proteção de rotas", () => {
  it("bloqueia rota protegida sem sessão", async () => {
    const res = await request(app).get("/periods");
    expect(res.status).toBe(401);
  });
});

describe("login social (Google)", () => {
  it("retorna uma URL de autorização válida do Google no sign-in social", async () => {
    const res = await request(app)
      .post("/api/auth/sign-in/social")
      .send({ provider: "google", callbackURL: "/" });

    expect(res.status).toBe(200);
    expect(res.body.redirect).toBe(true);
    expect(res.body.url).toContain("accounts.google.com");
    expect(res.body.url).toContain(`client_id=${process.env.GOOGLE_CLIENT_ID}`);
    // O fluxo completo (troca de código, callback, criação/vínculo de conta)
    // só dá pra validar manualmente contra o Google de verdade — ver README.
  });
});
