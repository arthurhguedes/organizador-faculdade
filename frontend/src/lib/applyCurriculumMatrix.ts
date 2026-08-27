import { curriculumSubjectsApi } from "../api/client";
import { stripDiacritics } from "./professorMatch";
import { rememberElectiveOptions } from "./curriculumMatrixImport";
import type { CurriculumSubject, CurriculumStatus, Subject } from "../api/types";
import type { ParsedCurriculumMatrix } from "./curriculumMatrixImport";

function normalize(text: string): string {
  return stripDiacritics(text).toUpperCase().replace(/\s+/g, " ").trim();
}

const ELECTIVE_SLOT_COUNT = 4;
// Vagas de eletiva ficam nos períodos 7 e 8 no fluxograma oficial do curso
// (2 vagas em cada) — fixo pra este curso específico, o PDF tabular só
// informa o total de 240h exigidas, sem dizer quando cursar.
const ELECTIVE_SLOT_PERIODS = [7, 7, 8, 8];
const electiveSlotName = (n: number) => `Eletiva ${n}`;
const ELECTIVE_SLOT_PATTERN = /^Eletiva \d+$/;

// Uma matéria da matriz é "concluída" se casar (por código, ou por nome
// quando o código não bate) com alguma Subject real do usuário fora do
// período selecionado no momento — o app já trata "período selecionado" como
// o período corrente em todo o resto da UI (Dashboard, Estudos, montador de
// grade), então qualquer outro período é, por convenção, período passado.
// Casar só com o período selecionado é "cursando". Sem nenhuma Subject
// correspondente, não mexe no status (fica como já estava, ou "pendente" se
// for entrada nova).
export function resolveCurriculumStatus(
  row: { code: string; name: string },
  subjects: Subject[],
  selectedPeriodId: number | null,
): CurriculumStatus | null {
  const normName = normalize(row.name);
  const normCode = normalize(row.code);
  const matches = subjects.filter(
    (s) => (s.code && normalize(s.code) === normCode) || (normName && normalize(s.name) === normName),
  );
  if (matches.length === 0) return null;
  // Sem período selecionado não dá pra saber o que é "corrente" — todo match
  // pareceria de "outro período" e cairia errado em concluída. Sem sinal,
  // não mexe (mesmo comportamento de matches.length === 0).
  if (selectedPeriodId === null) return null;
  const hasOtherPeriod = matches.some((s) => s.periodId !== selectedPeriodId);
  return hasOtherPeriod ? "concluida" : "cursando";
}

export type ApplyCurriculumMatrixResult = {
  created: number;
  updated: number;
  statusResolved: number;
  electiveSlotsCreated: number;
};

export async function applyCurriculumMatrix(
  parsed: ParsedCurriculumMatrix,
  existing: CurriculumSubject[],
  subjects: Subject[],
  selectedPeriodId: number | null,
  userId: number,
): Promise<ApplyCurriculumMatrixResult> {
  rememberElectiveOptions(userId, parsed.electiveOptions);

  const byCode = new Map(existing.filter((item) => item.code).map((item) => [normalize(item.code!), item]));

  let created = 0;
  let updated = 0;
  let statusResolved = 0;
  let electiveSlotsCreated = 0;

  for (const row of parsed.obrigatorias) {
    const resolvedStatus = resolveCurriculumStatus(row, subjects, selectedPeriodId);
    const current = byCode.get(normalize(row.code));

    if (!current) {
      await curriculumSubjectsApi.create({
        name: row.name,
        code: row.code,
        workload: row.workload,
        suggestedPeriod: row.suggestedPeriod,
        status: resolvedStatus ?? "pendente",
        kind: "obrigatoria",
        completedHours: 0,
      });
      created++;
      if (resolvedStatus) statusResolved++;
      continue;
    }

    const nextStatus = resolvedStatus ?? current.status;
    const changed =
      current.name !== row.name ||
      current.workload !== row.workload ||
      current.suggestedPeriod !== row.suggestedPeriod ||
      current.status !== nextStatus ||
      current.kind !== "obrigatoria";

    if (changed) {
      await curriculumSubjectsApi.update(current.id, {
        name: row.name,
        code: row.code,
        workload: row.workload,
        suggestedPeriod: row.suggestedPeriod,
        status: nextStatus,
        kind: "obrigatoria",
        completedHours: current.completedHours,
      });
      updated++;
      if (resolvedStatus && resolvedStatus !== current.status) statusResolved++;
    }
  }

  // Atividades (estágio, atividades complementares, extensão) são medidas em
  // horas acumuladas, não em status binário — reimportar nunca mexe em
  // completedHours/status já registrados, só sincroniza nome/carga oficial.
  for (const row of parsed.atividades) {
    const current = byCode.get(normalize(row.code));

    if (!current) {
      await curriculumSubjectsApi.create({
        name: row.name,
        code: row.code,
        workload: row.workload,
        suggestedPeriod: null,
        status: "pendente",
        kind: "atividade",
        completedHours: 0,
      });
      created++;
      continue;
    }

    const changed = current.name !== row.name || current.workload !== row.workload || current.kind !== "atividade";
    if (changed) {
      await curriculumSubjectsApi.update(current.id, {
        name: row.name,
        code: row.code,
        workload: row.workload,
        suggestedPeriod: current.suggestedPeriod,
        status: current.status,
        kind: "atividade",
        completedHours: current.completedHours,
      });
      updated++;
    }
  }

  // Vagas de eletiva: cria só as que ainda não existem (nunca mexe numa vaga
  // já escolhida pelo usuário), e tenta resolver o status das já escolhidas
  // de novo — pode ter mudado desde a última importação (ex: o usuário
  // acabou de lançar a matéria correspondente no histórico).
  const existingSlots = existing.filter((item) => item.kind === "eletiva" && ELECTIVE_SLOT_PATTERN.test(item.name));
  const existingSlotNumbers = new Set(existingSlots.map((slot) => Number(slot.name.replace("Eletiva ", ""))));

  for (const slot of existingSlots) {
    if (!slot.code) continue;
    const resolvedStatus = resolveCurriculumStatus({ code: slot.code, name: "" }, subjects, selectedPeriodId);
    if (resolvedStatus && resolvedStatus !== slot.status) {
      await curriculumSubjectsApi.update(slot.id, {
        name: slot.name,
        code: slot.code,
        workload: slot.workload,
        suggestedPeriod: slot.suggestedPeriod,
        status: resolvedStatus,
        kind: "eletiva",
        completedHours: slot.completedHours,
      });
      updated++;
      statusResolved++;
    }
  }

  for (let n = 1; n <= ELECTIVE_SLOT_COUNT; n++) {
    if (existingSlotNumbers.has(n)) continue;
    await curriculumSubjectsApi.create({
      name: electiveSlotName(n),
      code: null,
      workload: 60,
      suggestedPeriod: ELECTIVE_SLOT_PERIODS[n - 1],
      status: "pendente",
      kind: "eletiva",
      completedHours: 0,
    });
    created++;
    electiveSlotsCreated++;
  }

  return { created, updated, statusResolved, electiveSlotsCreated };
}
