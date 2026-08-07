import type {
  Assignment,
  Exam,
  Offering,
  Period,
  Professor,
  Schedule,
  Subject,
  SubjectDetails,
} from "./types";
import type { ParsedOffering } from "../lib/offeringsImport";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export class ApiError extends Error {}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
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
export const subjectsApi = crud<Subject, Omit<Subject, "id">>("subjects");
export const schedulesApi = crud<Schedule, Omit<Schedule, "id">>("schedules");
export const assignmentsApi = crud<Assignment, Omit<Assignment, "id">>("assignments");
export const examsApi = crud<Exam, Omit<Exam, "id">>("exams");

export const getSubjectDetails = (id: number) =>
  request<SubjectDetails>(`/subjects/${id}/details`);

export const offeringsApi = {
  list: () => request<Offering[]>("/offerings"),
  import: (offerings: ParsedOffering[]) =>
    request<{ message: string }>("/offerings/import", {
      method: "POST",
      body: JSON.stringify({ offerings }),
    }),
};
