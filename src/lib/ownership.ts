import { and, eq } from "drizzle-orm";
import { db } from "../db/index.js";
import * as schema from "../db/schema.js";

/**
 * Confere se a matéria existe **e** pertence ao usuário da sessão.
 *
 * O `user_id` das tabelas filhas sozinho não basta: sem esta checagem, mandar
 * um `subjectId` de outro usuário criava uma linha com o meu `user_id`
 * apontando pra matéria alheia (a FK existe, então o Postgres aceita). Um
 * `subjectId` inexistente, por sua vez, voltava 500 de violação de FK em vez
 * de um 400 explicando o problema.
 *
 * Estava copiada em seis routers; agora é uma função só, usada pela factory
 * de CRUD e pelas rotas escritas à mão.
 */
export async function ownsSubject(userId: number, subjectId: number): Promise<boolean> {
  const [subject] = await db
    .select({ id: schema.subjects.id })
    .from(schema.subjects)
    .where(and(eq(schema.subjects.id, subjectId), eq(schema.subjects.userId, userId)));
  return Boolean(subject);
}
