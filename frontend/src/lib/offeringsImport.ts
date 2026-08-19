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

export type RawOfferingsSheet = {
  headers: string[];
  rows: Record<string, unknown>[];
};

const WEEKDAYS = ["segunda", "terça", "quarta", "quinta", "sexta", "sábado"] as const;
type Weekday = (typeof WEEKDAYS)[number];

export type OfferingField =
  | "subjectCode"
  | "subjectName"
  | "professorName"
  | "turma"
  | "curso"
  | "vagas"
  | "depto"
  | "workloadHours"
  | "theoryHours"
  | "practiceHours"
  | Weekday;

export const OFFERING_FIELDS: OfferingField[] = [
  "subjectCode",
  "subjectName",
  "professorName",
  "turma",
  "curso",
  "vagas",
  "depto",
  "workloadHours",
  "theoryHours",
  "practiceHours",
  ...WEEKDAYS,
];

export const REQUIRED_OFFERING_FIELDS: OfferingField[] = ["subjectCode", "subjectName"];

export const OFFERING_FIELD_LABELS: Record<OfferingField, string> = {
  subjectCode: "Código da disciplina",
  subjectName: "Nome da disciplina",
  professorName: "Professor(a)",
  turma: "Turma",
  curso: "Curso",
  vagas: "Vagas",
  depto: "Departamento",
  workloadHours: "Carga horária (CH)",
  theoryHours: "Horas teóricas",
  practiceHours: "Horas práticas",
  segunda: "Segunda-feira",
  terça: "Terça-feira",
  quarta: "Quarta-feira",
  quinta: "Quinta-feira",
  sexta: "Sexta-feira",
  sábado: "Sábado",
};

export type ColumnMapping = Partial<Record<OfferingField, string>>;

const FIELD_SYNONYMS: Record<OfferingField, string[]> = {
  subjectCode: ["codigo", "cod", "cod disciplina", "codigo da disciplina", "sigla"],
  subjectName: ["nome", "disciplina", "materia", "nome da disciplina", "componente", "componente curricular"],
  professorName: ["professor", "professor a", "docente", "prof", "professor responsavel"],
  turma: ["turma", "grupo", "sec", "secao"],
  curso: ["curso"],
  vagas: ["vagas", "vagas totais", "num vagas", "n vagas", "qtd vagas"],
  depto: ["depto", "departamento", "unidade", "setor"],
  workloadHours: ["ch", "ch total", "carga horaria", "carga horaria total"],
  theoryHours: ["t", "teorica", "teoricas", "horas teoricas", "ch teorica"],
  practiceHours: ["p", "pratica", "praticas", "horas praticas", "ch pratica"],
  segunda: ["segunda", "segunda feira", "seg"],
  terça: ["terca", "terca feira", "ter"],
  quarta: ["quarta", "quarta feira", "qua"],
  quinta: ["quinta", "quinta feira", "qui"],
  sexta: ["sexta", "sexta feira", "sex"],
  sábado: ["sabado", "sab"],
};

function normalizeHeader(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[().-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function suggestOfferingsMapping(headers: string[]): ColumnMapping {
  const normalizedHeaders = headers.map((h) => ({ header: h, normalized: normalizeHeader(h) }));
  const mapping: ColumnMapping = {};
  const usedHeaders = new Set<string>();

  for (const field of OFFERING_FIELDS) {
    const synonyms = FIELD_SYNONYMS[field];
    const exact = normalizedHeaders.find((h) => !usedHeaders.has(h.header) && synonyms.includes(h.normalized));
    if (exact) {
      mapping[field] = exact.header;
      usedHeaders.add(exact.header);
    }
  }

  for (const field of OFFERING_FIELDS) {
    if (mapping[field]) continue;
    const synonyms = FIELD_SYNONYMS[field];
    const partial = normalizedHeaders.find(
      (h) => !usedHeaders.has(h.header) && synonyms.some((s) => s.length > 2 && h.normalized.includes(s)),
    );
    if (partial) {
      mapping[field] = partial.header;
      usedHeaders.add(partial.header);
    }
  }

  return mapping;
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
  const n = Number(String(value).replace(",", "."));
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

function padTime(value: string): string {
  const [h, m] = value.split(":");
  return `${h.padStart(2, "0")}:${m}`;
}

const TIME_SLOT_PATTERN = /(\d{1,2}:\d{2})(?::\d{2})?\s*[-–]\s*(\d{1,2}:\d{2})(?::\d{2})?\s*([TP])?/gi;

function parseScheduleCell(weekday: string, cell: unknown): ParsedScheduleSlot[] {
  if (isEmpty(cell)) return [];

  const slots: ParsedScheduleSlot[] = [];
  for (const match of String(cell).matchAll(TIME_SLOT_PATTERN)) {
    const [, start, end, kind] = match;
    slots.push({
      weekday,
      startTime: padTime(start),
      endTime: padTime(end),
      kind: (kind?.toUpperCase() as "T" | "P" | undefined) ?? "T",
    });
  }
  return slots;
}

export function parseOfferingsRows(rows: Record<string, unknown>[], mapping: ColumnMapping): ParsedOffering[] {
  const codeColumn = mapping.subjectCode;
  const nameColumn = mapping.subjectName;
  if (!codeColumn || !nameColumn) return [];

  const offerings: ParsedOffering[] = [];
  const turmaCounters = new Map<string, number>();

  for (const row of rows) {
    const subjectCode = toText(row[codeColumn]);
    const subjectName = toText(row[nameColumn]);
    if (!subjectCode || !subjectName) continue;

    const schedules: ParsedScheduleSlot[] = [];
    for (const weekday of WEEKDAYS) {
      const column = mapping[weekday];
      if (!column) continue;
      schedules.push(...parseScheduleCell(weekday, row[column]));
    }

    let turma = mapping.turma ? normalizeTurma(row[mapping.turma]) : "";
    if (!turma) {
      const next = (turmaCounters.get(subjectCode) ?? 0) + 1;
      turmaCounters.set(subjectCode, next);
      turma = String(next).padStart(2, "0");
    }

    offerings.push({
      professorName: mapping.professorName ? cleanProfessorName(row[mapping.professorName]) : null,
      subjectCode,
      subjectName,
      turma,
      curso: mapping.curso ? toText(row[mapping.curso]) : null,
      vagas: mapping.vagas ? toNumber(row[mapping.vagas]) : null,
      depto: mapping.depto ? toText(row[mapping.depto]) : null,
      workloadHours: mapping.workloadHours ? toNumber(row[mapping.workloadHours]) : null,
      theoryHours: mapping.theoryHours ? toNumber(row[mapping.theoryHours]) : null,
      practiceHours: mapping.practiceHours ? toNumber(row[mapping.practiceHours]) : null,
      schedules,
    });
  }

  return offerings;
}

export async function readOfferingsSheet(file: File): Promise<RawOfferingsSheet> {
  const XLSX = await import("xlsx");
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw new Error("O arquivo não tem nenhuma aba/planilha");
  }
  const sheet = workbook.Sheets[firstSheetName];
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: null, blankrows: false });
  if (matrix.length === 0) {
    throw new Error("A planilha está vazia");
  }

  const headerRow = matrix[0] as unknown[];
  const seen = new Set<string>();
  const headers = headerRow.map((cell, index) => {
    let text = cell === null || cell === undefined ? "" : String(cell).trim();
    if (!text) text = `Coluna ${index + 1}`;
    while (seen.has(text)) text = `${text} (2)`;
    seen.add(text);
    return text;
  });

  const rows: Record<string, unknown>[] = [];
  for (const line of matrix.slice(1)) {
    const values = line as unknown[];
    const row: Record<string, unknown> = {};
    headers.forEach((header, index) => {
      row[header] = values[index] ?? null;
    });
    rows.push(row);
  }

  return { headers, rows };
}

const MAPPING_STORAGE_PREFIX = "notary:offerings-mapping:";

function mappingSignature(headers: string[]): string {
  return headers.join("|");
}

export function recallOfferingsMapping(headers: string[]): ColumnMapping | null {
  try {
    const raw = localStorage.getItem(MAPPING_STORAGE_PREFIX + mappingSignature(headers));
    return raw ? (JSON.parse(raw) as ColumnMapping) : null;
  } catch {
    return null;
  }
}

export function rememberOfferingsMapping(headers: string[], mapping: ColumnMapping): void {
  try {
    localStorage.setItem(MAPPING_STORAGE_PREFIX + mappingSignature(headers), JSON.stringify(mapping));
  } catch {
    // localStorage indisponível (modo privado, quota) — não é crítico, só perde a memorização
  }
}

function institutionKey(userId: number, institution: string): string {
  return `${MAPPING_STORAGE_PREFIX}institution:${userId}:${institution.trim().toLowerCase()}`;
}

export function recallInstitutionMapping(userId: number, institution: string | null): ColumnMapping | null {
  if (!institution || !institution.trim()) return null;
  try {
    const raw = localStorage.getItem(institutionKey(userId, institution));
    return raw ? (JSON.parse(raw) as ColumnMapping) : null;
  } catch {
    return null;
  }
}

export function rememberInstitutionMapping(userId: number, institution: string | null, mapping: ColumnMapping): void {
  if (!institution || !institution.trim()) return;
  try {
    localStorage.setItem(institutionKey(userId, institution), JSON.stringify(mapping));
  } catch {
    // localStorage indisponível — não é crítico, só perde a memorização
  }
}

// Mantém só os campos cuja coluna lembrada existe nesta planilha — a faculdade pode ter mudado colunas entre semestres.
export function applyInstitutionMapping(headers: string[], institutionMapping: ColumnMapping): ColumnMapping {
  const headerSet = new Set(headers);
  const applied: ColumnMapping = {};
  for (const field of OFFERING_FIELDS) {
    const header = institutionMapping[field];
    if (header && headerSet.has(header)) applied[field] = header;
  }
  return applied;
}
