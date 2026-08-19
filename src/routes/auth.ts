import { Router } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import * as schema from "../db/schema.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { isUniqueViolation } from "../lib/http.js";

const router = Router();

// Cadastro, login, logout e sessão são geridos pelo Better Auth em
// /api/auth/* (ver src/auth.ts e src/app.ts). Essa rota só cuida do perfil
// e de dados próprios do app que não fazem parte do modelo de auth.

function toPublicUser(user: typeof schema.users.$inferSelect) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    plan: user.plan,
    planBillingCycle: user.planBillingCycle,
    institution: user.institution,
    course: user.course,
    birthDate: user.birthDate,
    avatarImage: user.avatarImage,
    linkedinUrl: user.linkedinUrl,
    githubUrl: user.githubUrl,
    instagramUrl: user.instagramUrl,
    xUrl: user.xUrl,
    username: user.username,
  };
}

const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/;

router.get("/me", requireAuth, async (req, res) => {
  try {
    const [user] = await db.select().from(schema.users).where(eq(schema.users.id, req.userId!));
    if (!user) {
      return res.status(401).json({ message: "Não autenticado" });
    }
    res.json(toPublicUser(user));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao buscar usuário" });
  }
});

// Ainda não existe cobrança de verdade — este endpoint é o que a página de
// Planos chama pra simular a assinatura. Quando o pagamento existir, é essa
// mesma coluna que o webhook do provedor vai atualizar em vez do usuário.
router.patch("/me/plan", requireAuth, async (req, res) => {
  const { plan, billingCycle } = req.body ?? {};
  if (plan !== "free" && plan !== "premium") {
    return res.status(400).json({ message: "plan precisa ser 'free' ou 'premium'" });
  }
  if (plan === "premium" && billingCycle !== "monthly" && billingCycle !== "yearly") {
    return res.status(400).json({ message: "billingCycle precisa ser 'monthly' ou 'yearly'" });
  }

  try {
    const [current] = await db.select().from(schema.users).where(eq(schema.users.id, req.userId!));
    if (!current) {
      return res.status(401).json({ message: "Não autenticado" });
    }

    const [updated] = await db
      .update(schema.users)
      .set({
        plan,
        planBillingCycle: plan === "premium" ? billingCycle : null,
        premiumSince: plan === "premium" ? (current.premiumSince ?? new Date()) : null,
      })
      .where(eq(schema.users.id, req.userId!))
      .returning();

    if (!updated) {
      return res.status(401).json({ message: "Não autenticado" });
    }
    res.json(toPublicUser(updated));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao atualizar plano" });
  }
});

router.patch("/me", requireAuth, async (req, res) => {
  const { name, institution, course, birthDate, avatarImage, linkedinUrl, githubUrl, instagramUrl, xUrl } =
    req.body ?? {};

  if (name !== undefined && !String(name).trim()) {
    return res.status(400).json({ message: "Nome não pode ficar vazio" });
  }
  if (birthDate !== undefined && birthDate !== null && Number.isNaN(Date.parse(birthDate))) {
    return res.status(400).json({ message: "Data de nascimento inválida" });
  }
  if (avatarImage !== undefined && avatarImage !== null) {
    if (typeof avatarImage !== "string" || !avatarImage.startsWith("data:image/")) {
      return res.status(400).json({ message: "Foto de perfil inválida" });
    }
    if (avatarImage.length > 1_500_000) {
      return res.status(400).json({ message: "Foto de perfil muito grande" });
    }
  }

  const fields: Partial<typeof schema.users.$inferInsert> = {};
  if (name !== undefined) fields.name = name;
  if (institution !== undefined) fields.institution = institution;
  if (course !== undefined) fields.course = course;
  if (birthDate !== undefined) fields.birthDate = birthDate;
  if (avatarImage !== undefined) fields.avatarImage = avatarImage;
  if (linkedinUrl !== undefined) fields.linkedinUrl = linkedinUrl;
  if (githubUrl !== undefined) fields.githubUrl = githubUrl;
  if (instagramUrl !== undefined) fields.instagramUrl = instagramUrl;
  if (xUrl !== undefined) fields.xUrl = xUrl;

  try {
    const [updated] = await db
      .update(schema.users)
      .set(fields)
      .where(eq(schema.users.id, req.userId!))
      .returning();
    if (!updated) {
      return res.status(401).json({ message: "Não autenticado" });
    }
    res.json(toPublicUser(updated));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao atualizar perfil" });
  }
});

router.patch("/me/username", requireAuth, async (req, res) => {
  const { username } = req.body ?? {};
  if (!username || !USERNAME_PATTERN.test(username)) {
    return res
      .status(400)
      .json({ message: "Nome de usuário deve ter 3–20 caracteres: letras minúsculas, números ou _" });
  }

  try {
    const [updated] = await db
      .update(schema.users)
      .set({ username, displayUsername: username })
      .where(eq(schema.users.id, req.userId!))
      .returning();
    if (!updated) {
      return res.status(401).json({ message: "Não autenticado" });
    }
    res.json(toPublicUser(updated));
  } catch (err) {
    if (isUniqueViolation(err)) {
      return res.status(409).json({ message: "Esse nome de usuário já está em uso" });
    }
    console.error(err);
    res.status(500).json({ message: "Erro ao atualizar nome de usuário" });
  }
});

export default router;
