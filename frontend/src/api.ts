const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

async function request(path: string, options?: RequestInit) {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(data?.message ?? `Erro ${res.status}`);
  }
  return data;
}

export const api = {
  list: (entity: string) => request(`/${entity}`),
  create: (entity: string, body: unknown) =>
    request(`/${entity}`, { method: "POST", body: JSON.stringify(body) }),
  remove: (entity: string, id: number) =>
    request(`/${entity}/${id}`, { method: "DELETE" }),
  subjectDetails: (id: number) => request(`/subjects/${id}/details`),
};
