export type AuthUser = {
  id: number;
  name: string;
  email: string;
  plan: "free" | "premium";
  planBillingCycle: "monthly" | "yearly" | null;
  institution: string | null;
  course: string | null;
  birthDate: string | null;
  avatarImage: string | null;
  linkedinUrl: string | null;
  githubUrl: string | null;
  instagramUrl: string | null;
  xUrl: string | null;
  username: string | null;
};

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
  code: string | null;
  workload: number;
  periodId: number;
  professorId: number;
  absences: number;
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

export type StudySession = {
  id: number;
  subjectId: number | null;
  topic: string | null;
  date: string;
  durationMinutes: number;
  source: "pomodoro" | "manual";
};

export type DailyNote = {
  id: number;
  date: string;
  content: string;
  done: boolean;
};

export type SyllabusEntry = {
  id: number;
  subjectId: number;
  lessonNumber: number;
  kind: "T" | "P" | null;
  date: string;
  content: string;
};

export type SubjectDetails = Subject & {
  schedules: Schedule[];
  assignments: Assignment[];
  exams: Exam[];
  syllabusEntries: SyllabusEntry[];
};

export type OfferingScheduleSlot = {
  id: number;
  offeringId: number;
  weekday: string;
  startTime: string;
  endTime: string;
  kind: "T" | "P";
};

export type Offering = {
  id: number;
  professorName: string | null;
  subjectCode: string;
  subjectName: string;
  turma: string;
  curso: string | null;
  vagas: number | null;
  depto: string | null;
  workloadHours: number | null;
  theoryHours: number | null;
  practiceHours: number | null;
  importedAt: string;
  schedules: OfferingScheduleSlot[];
};

export type CurriculumStatus = "pendente" | "cursando" | "concluida";

export type CurriculumSubject = {
  id: number;
  name: string;
  code: string | null;
  workload: number;
  suggestedPeriod: number | null;
  status: CurriculumStatus;
};

export type AcademicRequestType =
  | "prerequisite_waiver"
  | "enrollment_adjustment"
  | "leave_of_absence"
  | "credit_recognition";

export type AcademicRequestStatus = "pendente" | "aprovado" | "recusado";

export type AcademicRequest = {
  id: number;
  type: AcademicRequestType;
  subjectId: number | null;
  requirements: string | null;
  status: AcademicRequestStatus;
  submittedAt: string;
  resolvedAt: string | null;
  rejectionReason: string | null;
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
