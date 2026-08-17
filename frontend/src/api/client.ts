import type {
  Assignment,
  AuthUser,
  CurriculumSubject,
  DailyNote,
  Exam,
  Offering,
  Period,
  Professor,
  Schedule,
  StudySession,
  Subject,
  SubjectDetails,
} from "./types";
import type { ParsedOffering } from "../lib/offeringsImport";
import type { SyllabusPdfEntry } from "../lib/planoDeEnsinoImport";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export class ApiError extends Error {}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    ...options,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(data?.message ?? `Erro ${res.status}`);
  }
  return data as T;
}

function crud<T, TInput>(entity: string) {
  return {
    list: () => request<T[]>(`/${entity}`),
    get: (id: number) => request<T>(`/${entity}/${id}`),
    create: (body: TInput) =>
      request<T[]>(`/${entity}`, { method: "POST", body: JSON.stringify(body) }),
    update: (id: number, body: TInput) =>
      request<T[]>(`/${entity}/${id}`, { method: "PUT", body: JSON.stringify(body) }),
    remove: (id: number) => request<{ message: string }>(`/${entity}/${id}`, { method: "DELETE" }),
  };
}

export const periodsApi = crud<Period, Omit<Period, "id">>("periods");
export const professorsApi = crud<Professor, Omit<Professor, "id">>("professors");
export const subjectsApi = crud<Subject, Omit<Subject, "id" | "absences">>("subjects");
export const schedulesApi = crud<Schedule, Omit<Schedule, "id">>("schedules");
export const assignmentsApi = crud<Assignment, Omit<Assignment, "id">>("assignments");
export const examsApi = crud<Exam, Omit<Exam, "id">>("exams");
export const studySessionsApi = crud<StudySession, Omit<StudySession, "id">>("study-sessions");
export const dailyNotesApi = crud<DailyNote, Omit<DailyNote, "id">>("daily-notes");

export const getSubjectDetails = (id: number) =>
  request<SubjectDetails>(`/subjects/${id}/details`);

export const updateSubjectAbsences = (id: number, absences: number) =>
  request<Subject[]>(`/subjects/${id}/absences`, {
    method: "PATCH",
    body: JSON.stringify({ absences }),
  });

export const curriculumSubjectsApi = crud<CurriculumSubject, Omit<CurriculumSubject, "id">>(
  "curriculum-subjects",
);

// Cadastro, login, logout e sessão são geridos pelo Better Auth (ver
// ../lib/authClient.ts) — este objeto só cobre o perfil/dados do app.
export const authApi = {
  me: () => request<AuthUser>("/auth/me"),
  updatePlan: (body: { plan: "free" | "premium"; billingCycle?: "monthly" | "yearly" }) =>
    request<AuthUser>("/auth/me/plan", { method: "PATCH", body: JSON.stringify(body) }),
  updateProfile: (
    body: Partial<{
      name: string;
      institution: string;
      course: string;
      birthDate: string | null;
      avatarImage: string | null;
      linkedinUrl: string;
      githubUrl: string;
      instagramUrl: string;
      xUrl: string;
    }>,
  ) => request<AuthUser>("/auth/me", { method: "PATCH", body: JSON.stringify(body) }),
  updateUsername: (username: string) =>
    request<AuthUser>("/auth/me/username", { method: "PATCH", body: JSON.stringify({ username }) }),
};

export const offeringsApi = {
  list: () => request<Offering[]>("/offerings"),
  import: (offerings: ParsedOffering[]) =>
    request<{ message: string }>("/offerings/import", {
      method: "POST",
      body: JSON.stringify({ offerings }),
    }),
};

export const syllabusEntriesApi = {
  remove: (id: number) => request<{ message: string }>(`/syllabus-entries/${id}`, { method: "DELETE" }),
  import: (subjectId: number, entries: SyllabusPdfEntry[]) =>
    request<{ message: string }>("/syllabus-entries/import", {
      method: "POST",
      body: JSON.stringify({ subjectId, entries }),
    }),
};
