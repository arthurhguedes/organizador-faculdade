import type { Period, SubjectDetails, SyllabusEntryPerAula } from "../api/types";

export type LessonOccurrence = {
  subjectId: number;
  subjectName: string;
  date: string; // YYYY-MM-DD
  scheduleId: number | null;
  title: string;
};

const JS_DAY_BY_WEEKDAY: Record<string, number> = {
  domingo: 0,
  segunda: 1,
  terça: 2,
  quarta: 3,
  quinta: 4,
  sexta: 5,
  sábado: 6,
};

function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

// Uma matéria sem plano de ensino aula-a-aula (sem data exata por aula, ex:
// plano de ensino no formato semanal, ou nenhum PDF importado ainda) não tem
// como saber a data exata de cada aula — mas tem os horários recorrentes
// cadastrados (`schedules`). Expande cada horário por todas as ocorrências
// daquele dia da semana dentro do intervalo do período letivo, pra a matéria
// aparecer no calendário mesmo sem plano de ensino algum.
function expandSchedules(subject: SubjectDetails, period: Period): LessonOccurrence[] {
  const occurrences: LessonOccurrence[] = [];
  const end = new Date(`${period.endDate}T00:00:00`);

  for (const schedule of subject.schedules) {
    const targetDay = JS_DAY_BY_WEEKDAY[schedule.weekday];
    if (targetDay === undefined) continue;

    const cursor = new Date(`${period.startDate}T00:00:00`);
    const offset = (targetDay - cursor.getDay() + 7) % 7;
    cursor.setDate(cursor.getDate() + offset);

    while (cursor <= end) {
      occurrences.push({
        subjectId: subject.id,
        subjectName: subject.name,
        date: toDateKey(cursor),
        scheduleId: schedule.id,
        title: `Aula de ${subject.name}`,
      });
      cursor.setDate(cursor.getDate() + 7);
    }
  }

  return occurrences;
}

// Matéria com plano de ensino aula-a-aula (data exata por aula) usa essa data
// direto, sem depender dos horários recorrentes — evita duplicar a aula caso
// o horário real tenha sido diferente do cadastrado num dia específico
// (feriado, reposição etc.), já que o PDF é a fonte mais precisa quando
// disponível nesse formato.
export function buildLessonOccurrences(subjects: SubjectDetails[], period: Period | null): LessonOccurrence[] {
  if (!period) return [];

  return subjects.flatMap((subject) => {
    const perAula = subject.syllabusEntries.filter(
      (entry): entry is SyllabusEntryPerAula => entry.format === "per_aula",
    );
    if (perAula.length > 0) {
      return perAula.map((entry) => ({
        subjectId: subject.id,
        subjectName: subject.name,
        date: entry.date,
        scheduleId: null,
        title: `Aula ${entry.lessonNumber}: ${entry.content}`,
      }));
    }
    return expandSchedules(subject, period);
  });
}

export function occurrenceKey(subjectId: number, date: string, scheduleId: number | null): string {
  return `${subjectId}:${date}:${scheduleId ?? "null"}`;
}
