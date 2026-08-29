import { Router, type Response } from "express";
import { and, eq } from "drizzle-orm";
import type { PgColumn, PgTable } from "drizzle-orm/pg-core";
import { db } from "../db/index.js";
import { isForeignKeyViolation, parseId } from "./http.js";
import { ownsSubject } from "./ownership.js";
import { parseBody, type z } from "./validate.js";

/**
 * Fábrica de router CRUD.
 *
 * Nove routers (`assignments`, `exams`, `schedules`, `periods`, `professors`,
 * `daily-notes`, `study-sessions`, `curriculum-subjects`, `academic-requests`)
 * eram o mesmo arquivo com os nomes trocados: as cinco rotas na mesma ordem,
 * o mesmo `parseId`, o mesmo filtro por `user_id`, o mesmo `try/catch` — só
 * mudavam a tabela, o schema de validação e as mensagens. Eram ~1.100 linhas
 * em que corrigir um detalhe (o filtro de dono, por exemplo) exigia lembrar de
 * repetir a correção em nove lugares.
 *
 * Aqui isso vira uma função só. O que **de fato** varia entre as entidades
 * virou opção; o que é exceção de verdade (exclusão em cascata de matéria,
 * transação de faltas, imports transacionais) continua escrito à mão nos seus
 * próprios arquivos, porque forçar esses casos na factory só deixaria os dois
 * lados piores.
 */

/** Tabela do app: toda uma tem `id` e pertence a um usuário via `user_id`. */
type OwnedTable = PgTable & {
  id: PgColumn;
  userId: PgColumn;
};

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Corpo já validado. O schema de cada entidade é que diz quais chaves existem;
 * aqui só precisamos saber que é um objeto (e, quando houver, ler `subjectId`).
 */
type CrudBody = Record<string, unknown>;

/**
 * Gênero gramatical do nome da entidade, pra mensagem sair em português
 * correto: "Prova não encontrad**a**" mas "Horário não encontrad**o**".
 */
type Gender = "f" | "m";

type EntityLabels = {
  /** Ex: "atividade" — usado nas mensagens no singular. */
  singular: string;
  /** Ex: "atividades" — usado na mensagem de erro do `GET /`. */
  plural: string;
  gender: Gender;
  /** Sobrescreve a mensagem derivada do `GET /` quando ela não sai natural. */
  listError?: string;
};

type CrudRouterOptions = {
  table: OwnedTable;
  /** Schema Zod do corpo, o mesmo pro POST e pro PUT (as rotas não fazem patch parcial). */
  bodySchema: z.ZodType;
  labels: EntityLabels;
  /**
   * `GET /:id`. `daily-notes` e `study-sessions` nunca tiveram essa rota (o
   * front lista tudo e filtra no client); manter é preservar a API como está
   * — refatoração não é hora de acrescentar rota.
   */
  includeGetById?: boolean;
  /**
   * Checagem de posse da matéria referida no corpo. `"required"` quando
   * `subjectId` é obrigatório (atividade, prova, horário); `"optional"`
   * quando a coluna é nullable (sessão de estudo sem matéria, requerimento
   * de trancamento de período inteiro).
   */
  subject?: "required" | "optional";
  /**
   * Mensagem de 400 quando o DELETE esbarra em FK — hoje só `periods`, que
   * não pode sumir com matérias vinculadas.
   */
  deleteConflictMessage?: string;
  /**
   * Roda dentro da transação do DELETE, antes de apagar a linha. É o gancho
   * da exclusão em cascata de `professors` (apaga as matérias dele junto).
   */
  beforeDelete?: (tx: Transaction, userId: number, id: number) => Promise<void>;
};

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function buildMessages({ singular, plural, gender, listError }: EntityLabels) {
  const found = gender === "f" ? "encontrada" : "encontrado";
  const removed = gender === "f" ? "removida" : "removido";
  return {
    listError: listError ?? `Erro ao buscar ${plural}`,
    getError: `Erro ao buscar ${singular}`,
    createError: `Erro ao criar ${singular}`,
    updateError: `Erro ao atualizar ${singular}`,
    deleteError: `Erro ao remover ${singular}`,
    notFound: `${capitalize(singular)} não ${found}`,
    removed: `${capitalize(singular)} ${removed} com sucesso`,
  };
}

export function createCrudRouter(options: CrudRouterOptions): Router {
  const { table, bodySchema, subject, deleteConflictMessage, beforeDelete } = options;
  const includeGetById = options.includeGetById ?? true;
  const messages = buildMessages(options.labels);

  const router = Router();

  // O `id` chega como texto na URL; o filtro por `user_id` entra em toda
  // query pra que o registro de outro usuário responda 404, não a linha dele.
  const belongsTo = (id: number, userId: number) => and(eq(table.id, id), eq(table.userId, userId));

  /**
   * Confere a posse da matéria do corpo, quando a entidade tem uma. Devolve
   * `true` se pode seguir; se não, já respondeu 400.
   */
  async function subjectIsUsable(body: CrudBody, userId: number, res: Response) {
    if (!subject) return true;
    const subjectId = body.subjectId as number | null | undefined;
    // Em `"optional"` a ausência é válida — só validamos quando veio algo.
    if (subject === "optional" && !subjectId) return true;
    if (await ownsSubject(userId, subjectId as number)) return true;
    res.status(400).json({ message: "subjectId não existe" });
    return false;
  }

  router.get("/", async (req, res) => {
    try {
      const rows = await db.select().from(table).where(eq(table.userId, req.userId!));
      res.json(rows);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: messages.listError });
    }
  });

  if (includeGetById) {
    router.get("/:id", async (req, res) => {
      const id = parseId(req.params.id);
      if (id === null) {
        return res.status(400).json({ message: "id inválido" });
      }

      try {
        const [row] = await db.select().from(table).where(belongsTo(id, req.userId!));
        if (!row) {
          return res.status(404).json({ message: messages.notFound });
        }
        res.json(row);
      } catch (err) {
        console.error(err);
        res.status(500).json({ message: messages.getError });
      }
    });
  }

  router.post("/", async (req, res) => {
    const body = parseBody(bodySchema, req.body, res) as CrudBody | null;
    if (!body) return;

    try {
      if (!(await subjectIsUsable(body, req.userId!, res))) return;

      // O Zod já removeu o que não está no schema, então dá pra espalhar o
      // corpo direto — inclusive o `user_id`, que nunca vem do cliente.
      const created = await db
        .insert(table)
        .values({ ...body, userId: req.userId! } as never)
        .returning();
      res.json(created);
    } catch (err) {
      console.error(err);
      if (subject && isForeignKeyViolation(err)) {
        return res.status(400).json({ message: "subjectId não existe" });
      }
      res.status(500).json({ message: messages.createError });
    }
  });

  router.put("/:id", async (req, res) => {
    const id = parseId(req.params.id);
    if (id === null) {
      return res.status(400).json({ message: "id inválido" });
    }

    const body = parseBody(bodySchema, req.body, res) as CrudBody | null;
    if (!body) return;

    try {
      if (!(await subjectIsUsable(body, req.userId!, res))) return;

      // Sem `userId` no `set`: o dono de uma linha não muda por PUT.
      const updated = await db
        .update(table)
        .set(body as never)
        .where(belongsTo(id, req.userId!))
        .returning();

      if (updated.length === 0) {
        return res.status(404).json({ message: messages.notFound });
      }
      res.json(updated);
    } catch (err) {
      console.error(err);
      if (subject && isForeignKeyViolation(err)) {
        return res.status(400).json({ message: "subjectId não existe" });
      }
      res.status(500).json({ message: messages.updateError });
    }
  });

  router.delete("/:id", async (req, res) => {
    const id = parseId(req.params.id);
    if (id === null) {
      return res.status(400).json({ message: "id inválido" });
    }

    try {
      const userId = req.userId!;
      const deleted = beforeDelete
        ? await db.transaction(async (tx) => {
            await beforeDelete(tx, userId, id);
            return tx.delete(table).where(belongsTo(id, userId)).returning();
          })
        : await db.delete(table).where(belongsTo(id, userId)).returning();

      if (deleted.length === 0) {
        return res.status(404).json({ message: messages.notFound });
      }
      res.json({ message: messages.removed });
    } catch (err) {
      console.error(err);
      if (deleteConflictMessage && isForeignKeyViolation(err)) {
        return res.status(400).json({ message: deleteConflictMessage });
      }
      res.status(500).json({ message: messages.deleteError });
    }
  });

  return router;
}
