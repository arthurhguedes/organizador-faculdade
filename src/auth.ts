import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import bcrypt from "bcryptjs";
import { db } from "./db/index.js";
import * as schema from "./db/schema.js";

const isProduction = process.env.NODE_ENV === "production";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    usePlural: true,
    schema: {
      users: schema.users,
      sessions: schema.sessions,
      accounts: schema.accounts,
      verifications: schema.verifications,
    },
  }),
  // users.id continua serial/integer (não muda as FKs das outras 12 tabelas
  // do app) — sem isso o Better Auth tentaria gerar um id string (nanoid) e
  // colidiria com a coluna serial. `false` deixa o Postgres gerar o id.
  advanced: {
    database: { generateId: false },
    useSecureCookies: isProduction,
    // Front na Vercel, back em outro domínio: cookie cross-site precisa de
    // "none" (só aceito com secure=true, daí só em produção). Em dev, mesma
    // origem via localhost, "lax" já basta e evita exigir HTTPS local — mesmo
    // raciocínio que o COOKIE_OPTIONS antigo (JWT) usava.
    defaultCookieAttributes: {
      sameSite: isProduction ? "none" : "lax",
      secure: isProduction,
    },
  },
  emailAndPassword: {
    enabled: true,
    // Mesmo hash (bcrypt) que a auth antiga usava, pra contas migradas
    // continuarem logando sem precisar redefinir senha.
    password: {
      hash: (password) => bcrypt.hash(password, 10),
      verify: ({ hash, password }) => bcrypt.compare(password, hash),
    },
  },
  // Só registra o provider se as credenciais existirem — sem isso, rodar sem
  // GOOGLE_CLIENT_ID/SECRET configurados (ex: antes do usuário criar o OAuth
  // client no Google Cloud Console, ou em teste) quebraria o boot do app.
  socialProviders:
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? {
          google: {
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          },
        }
      : undefined,
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BACKEND_URL ?? "http://localhost:3000",
  trustedOrigins: [process.env.FRONTEND_URL ?? "http://localhost:5173"],
  // Sem isso, o rate limit do Better Auth (3 tentativas de login/10s por IP,
  // padrão da lib) só liga sozinho quando NODE_ENV=production — em dev fica
  // desligado, e em produção depende de o host setar essa env var certinho.
  // Deixa explícito e sempre ligado (exceto em teste — os testes de
  // src/auth.test.ts fazem vários sign-up/sign-in em sequência rápida a
  // partir da mesma origem e cairiam no próprio limite).
  rateLimit: {
    enabled: process.env.NODE_ENV !== "test",
  },
});
