import { curriculumSubjectsApi } from "../api/client";
import { stripDiacritics } from "./professorMatch";
import type { CurriculumSubject, Subject } from "../api/types";
import type { ParsedCurriculumRow } from "./curriculumMatrixImport";

function normalize(text: string): string {
  return stripDiacritics(text).toUpperCase().replace(/\s+/g, " ").trim();
}

// Uma matéria da matriz é "concluída" se casar (por código, ou por nome
// quando o código não bate) com alguma Subject real do usuário fora do
// período selecionado no momento — o app já trata "período selecionado" como
// o período corrente em todo o resto da UI (Dashboard, Estudos, montador de
// grade), então qualquer outro período é, por convenção, período passado.
// Casar só com o período selecionado é "cursando". Sem nenhuma Subject
// correspondente, não mexe no status (fica como já estava, ou "pendente" se
// for entrada nova).
function resolveStatus(
  row: ParsedCurriculumRow,
  subjects: Subject[],
  selectedPeriodId: number | null,
): CurriculumSubject["status"] | null {
  const normName = normalize(row.name);
  const normCode = normalize(row.code);
  const matches = subjects.filter(
    (s) => (s.code && normalize(s.code) === normCode) || normalize(s.name) === normName,
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
};

export async function applyCurriculumMatrix(
  rows: ParsedCurriculumRow[],
  existing: CurriculumSubject[],
  subjects: Subject[],
  selectedPeriodId: number | null,
): Promise<ApplyCurriculumMatrixResult> {
  const byCode = new Map(existing.filter((item) => item.code).map((item) => [normalize(item.code!), item]));

  let created = 0;
  let updated = 0;
  let statusResolved = 0;

  for (const row of rows) {
    const resolvedStatus = resolveStatus(row, subjects, selectedPeriodId);
    const current = byCode.get(normalize(row.code));

    if (!current) {
      await curriculumSubjectsApi.create({
        name: row.name,
        code: row.code,
        workload: row.workload,
        suggestedPeriod: row.suggestedPeriod,
        status: resolvedStatus ?? "pendente",
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
      current.status !== nextStatus;

    if (changed) {
      await curriculumSubjectsApi.update(current.id, {
        name: row.name,
        code: row.code,
        workload: row.workload,
        suggestedPeriod: row.suggestedPeriod,
        status: nextStatus,
      });
      updated++;
      if (resolvedStatus && resolvedStatus !== current.status) statusResolved++;
    }
  }

  return { created, updated, statusResolved };
}
