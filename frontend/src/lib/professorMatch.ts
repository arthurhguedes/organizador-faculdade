import { professorsApi } from "../api/client";
import type { Professor } from "../api/types";

export function stripDiacritics(text: string): string {
  return Array.from(text.normalize("NFD"))
    .filter((char) => char.codePointAt(0)! < 128)
    .join("");
}

export function slugifyName(name: string): string {
  return stripDiacritics(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "");
}

export function createProfessorMatcher(existing: Professor[]) {
  const byName = new Map<string, Professor>(existing.map((p) => [p.name.trim().toLowerCase(), p]));

  return async function findOrCreateProfessor(name: string): Promise<Professor> {
    const key = name.trim().toLowerCase();
    const found = byName.get(key);
    if (found) return found;

    const [created] = await professorsApi.create({
      name,
      email: `${slugifyName(name)}@a-definir.com`,
    });
    byName.set(key, created);
    return created;
  };
}
