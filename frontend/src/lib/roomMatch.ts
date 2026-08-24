import { stripDiacritics } from "./professorMatch";
import type { RoomAllocation, Schedule, Subject } from "../api/types";

function normalizeCode(code: string): string {
  return code.trim().toUpperCase();
}

export function normalizeName(name: string): string {
  return stripDiacritics(name).toLowerCase().replace(/\s+/g, " ").trim();
}

// Cruza um horário pessoal com o mapa de salas importado por código da
// disciplina + dia + horário exatos. Não dá pra usar turma (subjects não tem
// esse campo) — na prática funciona bem pra grades montadas via "Montar
// Grade", já que o horário copiado de lá é o mesmo horário oficial que
// aparece no mapa de salas.
export function findRoomForSchedule(
  subject: Pick<Subject, "code">,
  schedule: Pick<Schedule, "weekday" | "startTime" | "endTime">,
  allocations: RoomAllocation[],
): RoomAllocation | null {
  if (!subject.code) return null;
  const code = normalizeCode(subject.code);
  return (
    allocations.find(
      (a) =>
        a.subjectCode &&
        normalizeCode(a.subjectCode) === code &&
        a.weekday === schedule.weekday &&
        a.startTime === schedule.startTime &&
        a.endTime === schedule.endTime,
    ) ?? null
  );
}

export function findAllocationsForProfessor(professorName: string, allocations: RoomAllocation[]): RoomAllocation[] {
  const target = normalizeName(professorName);
  return allocations.filter((a) => a.professorName && normalizeName(a.professorName) === target);
}
