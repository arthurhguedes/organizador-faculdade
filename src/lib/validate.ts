import type { Response } from "express";
import { z } from "zod";

/**
 * Valida `req.body` contra um schema Zod. Se passar, devolve o corpo já
 * tipado e normalizado; se não, **já responde** 400 com uma mensagem em
 * português no mesmo formato `{ message }` que o resto da API usa e devolve
 * `null` — o handler só precisa de `if (!body) return;`.
 *
 * Antes disso a validação era `if (!name || !workload)`, que só pegava campo
 * ausente: mandar `weight: "abc"` passava pela checagem, quebrava lá no
 * Postgres e voltava um 500 genérico em vez de um 400 explicando o problema.
 */
export function parseBody<S extends z.ZodType>(schema: S, body: unknown, res: Response): z.infer<S> | null {
  const result = schema.safeParse(body ?? {});
  if (result.success) {
    return result.data;
  }
  res.status(400).json({ message: firstIssueMessage(result.error) });
  return null;
}

// Só a primeira mensagem: o front mostra `message` num toast de uma linha, não
// tem onde listar erro por campo. Todos os helpers abaixo já embutem o nome do
// campo na mensagem, então a primeira sozinha diz o que corrigir.
function firstIssueMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Dados inválidos";
}

// --- Tipos de campo que se repetem nas rotas ------------------------------
// Cada helper recebe o rótulo do campo pra mensagem sair dizendo qual campo
// falhou, já que só a primeira mensagem chega ao usuário.

/** Texto obrigatório. Espaços das pontas são removidos antes de salvar. */
export const requiredText = (label: string) =>
  z.string({ error: `${label} é obrigatório` }).trim().min(1, { error: `${label} não pode ficar vazio` });

/**
 * Texto opcional. Aceita ausente, `null` ou string; `""` e só-espaços viram
 * `null` — mesma normalização que as rotas já faziam com `campo || null`.
 *
 * Em rota de PATCH (atualização parcial) use `optionalText.optional()`: sem
 * esse `.optional()` o campo ausente vira `null` e o PATCH apagaria o valor
 * que já estava salvo, em vez de deixá-lo quieto.
 */
export const optionalText = z
  .string()
  .nullish()
  .transform((value) => value?.trim() || null);

/**
 * Id de chave estrangeira vindo do corpo. Aceita número ou string numérica
 * porque parte do front manda o `value` cru de um `<select>`; rejeita "abc",
 * `null` e objeto — que hoje passavam direto e estouravam 500 no Postgres.
 */
export const requiredId = (label: string) =>
  z
    .union([z.number(), z.string()], { error: `${label} é obrigatório` })
    .transform((value) => (typeof value === "string" ? Number(value.trim()) : value))
    .refine((value) => Number.isInteger(value) && value > 0, { error: `${label} inválido` });

/** Igual ao `requiredId`, mas aceita ausente/`null` (FK opcional). */
export const optionalId = (label: string) =>
  z
    .union([z.number(), z.string(), z.null()])
    .optional()
    .transform((value) => {
      if (value === null || value === undefined || value === "") return null;
      return typeof value === "string" ? Number(value.trim()) : value;
    })
    .refine((value) => value === null || (Number.isInteger(value) && value > 0), {
      error: `${label} inválido`,
    });

/** Número com casas decimais (peso, nota, carga horária da planilha). */
export const requiredNumber = (label: string) => z.number({ error: `${label} deve ser um número` });

/** Número opcional: aceita ausente ou `null` (ex: nota ainda não lançada). */
export const optionalNumber = (label: string) =>
  z.number({ error: `${label} deve ser um número` }).nullish().transform((value) => value ?? null);

/** Inteiro >= 0 (carga horária, minutos, faltas). */
export const requiredInteger = (label: string) =>
  z.int({ error: `${label} deve ser um número inteiro` }).min(0, { error: `${label} não pode ser negativo` });

/** Inteiro >= 0 opcional. */
export const optionalInteger = (label: string) =>
  z
    .int({ error: `${label} deve ser um número inteiro` })
    .min(0, { error: `${label} não pode ser negativo` })
    .nullish()
    .transform((value) => value ?? null);

/** Data no formato que o `<input type="date">` e os parsers de PDF produzem. */
export const requiredDate = (label: string) =>
  z
    .string({ error: `${label} é obrigatório` })
    .regex(/^\d{4}-\d{2}-\d{2}$/, { error: `${label} deve estar no formato AAAA-MM-DD` });

/** Data opcional, mesmo formato. */
export const optionalDate = (label: string) =>
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, { error: `${label} deve estar no formato AAAA-MM-DD` })
    .nullish()
    .transform((value) => value ?? null);

/** Campo de lista fechada (status, tipo, origem). */
export const choice = <T extends readonly [string, ...string[]]>(label: string, values: T) =>
  z.enum(values, { error: `${label} deve ser um de: ${values.join(", ")}` });

/** Lista que não pode vir vazia (payloads de importação). */
export const nonEmptyArray = <S extends z.ZodType>(label: string, item: S) =>
  z.array(item, { error: `${label} deve ser uma lista` }).min(1, { error: `${label} não pode ficar vazio` });

export { z };
