export type Period = {
  id: number;
  label: string;
  startDate: string;
  endDate: string;
};

export type Professor = {
  id: number;
  name: string;
  email: string;
};

export type Subject = {
  id: number;
  name: string;
  workload: number;
  periodId: number;
  professorId: number;
};

export type Schedule = {
  id: number;
  subjectId: number;
  weekday: string;
  startTime: string;
  endTime: string;
};

export type Assignment = {
  id: number;
  subjectId: number;
  title: string;
  dueDate: string;
  weight: number;
  grade: number | null;
};

export type Exam = {
  id: number;
  subjectId: number;
  title: string;
  date: string;
  weight: number;
  grade: number | null;
};

export type SubjectDetails = Subject & {
  schedules: Schedule[];
  assignments: Assignment[];
  exams: Exam[];
};

export const WEEKDAYS = [
  "segunda",
  "terça",
  "quarta",
  "quinta",
  "sexta",
  "sábado",
  "domingo",
] as const;
