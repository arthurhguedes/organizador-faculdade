import { Router } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import * as schema from "../db/schema.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { isUniqueViolation } from "../lib/http.js";
import { optionalText, parseBody, requiredText, z } from "../lib/validate.js";

const router = Router();

// Cadastro, login, logout e sessão são geridos pelo Better Auth em
// /api/auth/* (ver src/auth.ts e src/app.ts). Essa rota só cuida do perfil
// e de dados próprios do app que não fazem parte do modelo de auth.

function toPublicUser(user: typeof schema.users.$inferSelect) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
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

const MALFORMED_USERNAME = "Nome de usuário deve ter 3–20 caracteres: letras minúsculas, números ou _";
const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/;

// Atualização parcial: cada aba do Perfil salva só os seus campos sem apagar
// os da outra, então todo campo é opcional e um campo ausente é diferente de
// um campo mandado como null (esse último limpa o valor).
const profilePatchSchema = z.object({
  name: requiredText("Nome").optional(),
  institution: optionalText.optional(),
  course: optionalText.optional(),
  birthDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, { error: "Data de nascimento inválida" })
    .nullable()
    .optional(),
  // Base64 embutido, não upload de arquivo: o client já redimensiona pra
  // 256x256 JPEG antes de mandar (ver frontend/src/lib/avatarImage.ts).
  avatarImage: z
    .string()
    .startsWith("data:image/", { error: "Foto de perfil inválida" })
    .max(1_500_000, { error: "Foto de perfil muito grande" })
    .nullable()
    .optional(),
  linkedinUrl: optionalText.optional(),
  githubUrl: optionalText.optional(),
  instagramUrl: optionalText.optional(),
  xUrl: optionalText.optional(),
});

const usernamePatchSchema = z.object({
  username: z.string({ error: MALFORMED_USERNAME }).regex(USERNAME_PATTERN, { error: MALFORMED_USERNAME }),
});

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

router.patch("/me", requireAuth, async (req, res) => {
  const body = parseBody(profilePatchSchema, req.body, res);
  if (!body) return;
  const { name, institution, course, birthDate, avatarImage, linkedinUrl, githubUrl, instagramUrl, xUrl } = body;

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
  const body = parseBody(usernamePatchSchema, req.body, res);
  if (!body) return;
  const { username } = body;

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
