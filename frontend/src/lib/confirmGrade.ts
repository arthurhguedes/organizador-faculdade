import { professorsApi, subjectsApi, schedulesApi } from "../api/client";
import type { Offering, Professor } from "../api/types";

const PLACEHOLDER_PROFESSOR_NAME = "Professor a definir";

function stripDiacritics(text: string): string {
  return Array.from(text.normalize("NFD"))
    .filter((char) => char.codePointAt(0)! < 128)
    .join("");
}

function slugifyName(name: string): string {
  return stripDiacritics(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "");
}

export async function confirmGrade(offerings: Offering[], periodId: number): Promise<void> {
  const professors = await professorsApi.list();
  const professorByName = new Map<string, Professor>(
    professors.map((p) => [p.name.trim().toLowerCase(), p]),
  );

  async function findOrCreateProfessor(name: string): Promise<Professor> {
    const key = name.trim().toLowerCase();
    const existing = professorByName.get(key);
    if (existing) return existing;

    const [created] = await professorsApi.create({
      name,
      email: `${slugifyName(name)}@a-definir.com`,
    });
    professorByName.set(key, created);
    return created;
  }

  for (const offering of offerings) {
    const professor = await findOrCreateProfessor(offering.professorName ?? PLACEHOLDER_PROFESSOR_NAME);

    const [subject] = await subjectsApi.create({
      name: offering.subjectName,
      code: offering.subjectCode,
      workload: Math.round(offering.workloadHours ?? 0),
      periodId,
      professorId: professor.id,
    });

    for (const slot of offering.schedules) {
      await schedulesApi.create({
        subjectId: subject.id,
        weekday: slot.weekday,
        startTime: slot.startTime,
        endTime: slot.endTime,
      });
    }
  }
}
