import { Router, type CookieOptions } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import * as schema from "../db/schema.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { isUniqueViolation } from "../lib/http.js";

const router = Router();

const isProduction = process.env.NODE_ENV === "production";

const COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  secure: isProduction,
  // "none" é necessário pro cookie ser enviado em requisições cross-site
  // (front-end na Vercel, back-end em outro domínio); em dev (mesma origem
  // via proxy/localhost) "lax" evita exigir HTTPS local.
  sameSite: isProduction ? "none" : "lax",
  maxAge: 30 * 24 * 60 * 60 * 1000,
  path: "/",
};

// Comparado quando o email não existe, para que login com email inexistente
// e login com senha errada levem aproximadamente o mesmo tempo (evita vazar
// por timing qual dos dois casos ocorreu).
const DUMMY_HASH = bcrypt.hashSync("timing-attack-mitigation", 10);

function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

router.post("/register", async (req, res) => {
  const { name, email, password } = req.body ?? {};
  if (!name || !email || !password) {
    return res.status(400).json({ message: "name, email e password são obrigatórios" });
  }
  if (String(password).length < 8) {
    return res.status(400).json({ message: "A senha precisa ter pelo menos 8 caracteres" });
  }

  const normalizedEmail = normalizeEmail(email);

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const [user] = await db
      .insert(schema.users)
      .values({ name, email: normalizedEmail, passwordHash })
      .returning();

    if (!user) {
      throw new Error("Falha ao criar usuário");
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, { expiresIn: "30d" });
    res.cookie("token", token, COOKIE_OPTIONS);
    res.json({ id: user.id, name: user.name, email: user.email });
  } catch (err) {
    if (isUniqueViolation(err)) {
      return res.status(409).json({ message: "Email já cadastrado" });
    }
    console.error(err);
    res.status(500).json({ message: "Erro ao criar conta" });
  }
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body ?? {};
  if (!email || !password) {
    return res.status(400).json({ message: "email e password são obrigatórios" });
  }

  const normalizedEmail = normalizeEmail(email);

  try {
    const [user] = await db.select().from(schema.users).where(eq(schema.users.email, normalizedEmail));

    const passwordMatches = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);

    if (!user || !passwordMatches) {
      return res.status(401).json({ message: "Email ou senha inválidos" });
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, { expiresIn: "30d" });
    res.cookie("token", token, COOKIE_OPTIONS);
    res.json({ id: user.id, name: user.name, email: user.email });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao fazer login" });
  }
});

router.post("/logout", requireAuth, (req, res) => {
  res.clearCookie("token", { ...COOKIE_OPTIONS, maxAge: undefined });
  res.json({ message: "Logout realizado" });
});

router.get("/me", requireAuth, async (req, res) => {
  try {
    const [user] = await db.select().from(schema.users).where(eq(schema.users.id, req.userId!));
    if (!user) {
      return res.status(401).json({ message: "Não autenticado" });
    }
    res.json({ id: user.id, name: user.name, email: user.email });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao buscar usuário" });
  }
});

export default router;
