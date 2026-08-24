import { professorsApi, subjectsApi, schedulesApi } from "../api/client";
import type { Offering } from "../api/types";
import { createProfessorMatcher } from "./professorMatch";

const PLACEHOLDER_PROFESSOR_NAME = "Professor a definir";

export async function confirmGrade(offerings: Offering[], periodId: number): Promise<void> {
  const professors = await professorsApi.list();
  const findOrCreateProfessor = createProfessorMatcher(professors);

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
        room: null,
      });
    }
  }
}
