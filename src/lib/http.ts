export function parseId(param: string): number | null {
  const id = Number(param);
  return Number.isInteger(id) ? id : null;
}

export function isForeignKeyViolation(err: unknown): boolean {
  if (typeof err !== "object" || err === null) {
    return false;
  }
  const { code, cause } = err as { code?: string; cause?: { code?: string } };
  return code === "23503" || cause?.code === "23503";
}
