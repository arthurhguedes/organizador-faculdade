export type ParsedScheduleSlot = {
  weekday: string;
  startTime: string;
  endTime: string;
  kind: "T" | "P";
};

export type ParsedOffering = {
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
  schedules: ParsedScheduleSlot[];
};

const WEEKDAY_COLUMNS: Record<string, string> = {
  SEGUNDA: "segunda",
  TERCA: "terça",
  QUARTA: "quarta",
  QUINTA: "quinta",
  SEXTA: "sexta",
  SABADO: "sábado",
};

const TIME_SLOT_PATTERN = /^(\d{2}:\d{2}):\d{2}-(\d{2}:\d{2}):\d{2}([TP])$/;

function normalizeKeys(row: Record<string, unknown>): Record<string, unknown> {
  const normalized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    normalized[key.trim().toUpperCase()] = value;
  }
  return normalized;
}

function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  const text = String(value).trim();
  return text === "" || text.toLowerCase() === "null";
}

function toText(value: unknown): string | null {
  if (isEmpty(value)) return null;
  return String(value).trim();
}

function toNumber(value: unknown): number | null {
  if (isEmpty(value)) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function normalizeTurma(value: unknown): string {
  const text = String(value ?? "").trim();
  return text.replace(/\.0$/, "");
}

function cleanProfessorName(value: unknown): string | null {
  const text = toText(value);
  if (!text) return null;
  const stripped = text.replace(/\s*\([TP+]+\)\s*$/i, "").trim();
  return stripped === "" ? null : stripped;
}

function parseScheduleCell(weekday: string, cell: unknown): ParsedScheduleSlot[] {
  if (isEmpty(cell)) return [];

  return String(cell)
    .split("/")
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => {
      const match = TIME_SLOT_PATTERN.exec(chunk);
      if (!match) return null;
      const [, startTime, endTime, kind] = match;
      return { weekday, startTime, endTime, kind: kind as "T" | "P" };
    })
    .filter((slot): slot is ParsedScheduleSlot => slot !== null);
}

export function parseOfferingsRows(rows: Record<string, unknown>[]): ParsedOffering[] {
  const offerings: ParsedOffering[] = [];

  for (const raw of rows) {
    const row = normalizeKeys(raw);
    const subjectCode = toText(row.CÓDIGO ?? row.CODIGO);
    const subjectName = toText(row.NOME);
    if (!subjectCode || !subjectName) continue;

    const schedules: ParsedScheduleSlot[] = [];
    for (const [column, weekday] of Object.entries(WEEKDAY_COLUMNS)) {
      schedules.push(...parseScheduleCell(weekday, row[column]));
    }

    offerings.push({
      professorName: cleanProfessorName(row["PROFESSOR(A)"]),
      subjectCode,
      subjectName,
      turma: normalizeTurma(row.TURMA),
      curso: toText(row.CURSO),
      vagas: toNumber(row.VAGAS),
      depto: toText(row.DEPTO),
      workloadHours: toNumber(row.CH),
      theoryHours: toNumber(row.T),
      practiceHours: toNumber(row.P),
      schedules,
    });
  }

  return offerings;
}

export async function parseOfferingsWorkbook(file: File): Promise<ParsedOffering[]> {
  const XLSX = await import("xlsx");
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw new Error("A planilha não tem nenhuma aba");
  }
  const sheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null });
  return parseOfferingsRows(rows);
}
