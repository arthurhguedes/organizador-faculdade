import { periodsApi, subjectsApi, examsApi, professorsApi } from "../api/client";
import { createProfessorMatcher } from "./professorMatch";
import type { ParsedHistorico } from "./historicoImport";

const PLACEHOLDER_PROFESSOR_NAME = "Professor a definir";

function synthesizePeriodDates(anoSem: string): { startDate: string; endDate: string } {
  const [yearStr, semStr] = anoSem.split("/");
  const year = Number(yearStr);
  return semStr === "1"
    ? { startDate: `${year}-02-01`, endDate: `${year}-07-31` }
    : { startDate: `${year}-08-01`, endDate: `${year}-12-31` };
}

export type ApplyHistoricoResult = {
  periodsCreated: number;
  subjectsCreated: number;
  subjectsSkipped: number;
};

export async function applyHistorico(parsed: ParsedHistorico): Promise<ApplyHistoricoResult> {
  const existingPeriods = await periodsApi.list();
  const periodByLabel = new Map(existingPeriods.map((p) => [p.label, p]));

  const existingSubjects = await subjectsApi.list();
  const professors = await professorsApi.list();
  const findOrCreateProfessor = createProfessorMatcher(professors);

  let periodsCreated = 0;
  let subjectsCreated = 0;
  let subjectsSkipped = 0;

  const anoSems = [...new Set(parsed.entries.map((e) => e.anoSem))];

  for (const anoSem of anoSems) {
    let period = periodByLabel.get(anoSem);
    if (!period) {
      const dates = synthesizePeriodDates(anoSem);
      const [created] = await periodsApi.create({ label: anoSem, ...dates });
      period = created;
      periodByLabel.set(anoSem, created);
      periodsCreated++;
    }

    const entriesForSem = parsed.entries.filter((e) => e.anoSem === anoSem);
    for (const entry of entriesForSem) {
      const alreadyExists = existingSubjects.some((s) => s.periodId === period!.id && s.code === entry.code);
      if (alreadyExists) {
        subjectsSkipped++;
        continue;
      }

      const professorEntry = parsed.professors.find((p) => p.anoSem === anoSem && p.code === entry.code);
      const professor = await findOrCreateProfessor(professorEntry?.professorName ?? PLACEHOLDER_PROFESSOR_NAME);

      const [subject] = await subjectsApi.create({
        name: entry.disciplina,
        code: entry.code,
        workload: entry.workloadHours ?? 0,
        periodId: period.id,
        professorId: professor.id,
      });

      if (entry.media !== null) {
        await examsApi.create({
          subjectId: subject.id,
          title: "Média final (histórico)",
          date: period.endDate,
          weight: 1,
          grade: entry.media,
        });
      }

      subjectsCreated++;
    }
  }

  return { periodsCreated, subjectsCreated, subjectsSkipped };
}
