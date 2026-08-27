// Importa a matriz curricular oficial (PDF que a PRÓ-REITORIA DE GRADUAÇÃO da
// UFOP disponibiliza por curso). A tabela é bem comportada (célula por
// célula, não texto livre como o plano de ensino), mas nomes longos quebram
// em 2 linhas (ex: "FUNDAMENTOS DE ORGANIZACAO E ARQUITETURA DE" /
// "COMPUTADORES") — a linha de continuação não tem código nem dígito, então
// dá pra distinguir de ruído tipo "1200 horas" (nota de pré-requisito de
// PROJETO INTEGRADOR/TCC, que tem dígito e por isso não se confunde com nome
// de disciplina em maiúsculas).
//
// Três tabelas do PDF viram três coisas diferentes (ver applyCurriculumMatrix.ts):
// - "DISCIPLINAS OBRIGATÓRIAS" -> linhas normais, uma por disciplina.
// - "DISCIPLINAS ELETIVAS" -> não vira linha da matriz (são só 4 vagas ao
//   todo, não são todas obrigatórias) — vira um catálogo de opções pro
//   usuário escolher em cada vaga de eletiva.
// - "ATIVIDADES" (estágio, atividades complementares, extensão) -> linhas
//   medidas em horas acumuladas, não em "cursando/concluída".

export type ParsedCurriculumRow = {
  code: string;
  name: string;
  workload: number;
  suggestedPeriod: number | null;
};

export type ElectiveOption = {
  code: string;
  name: string;
  workload: number;
};

export type ParsedCurriculumMatrix = {
  obrigatorias: ParsedCurriculumRow[];
  atividades: ParsedCurriculumRow[];
  electiveOptions: ElectiveOption[];
};

const CODE = "[A-Z]{2,6}\\d{2,4}";
const OBRIGATORIA_ROW = new RegExp(`^(${CODE})\\s+(.+?)\\s+(\\d+)\\/(\\d+)\\s+(\\d+)\\s+(\\d+)\\s+(\\d+)\\s+(\\d+)$`);
const ELETIVA_ROW = new RegExp(`^(${CODE})\\s+(.+?)\\s+(\\d+)\\/(\\d+)\\s+(\\d+)\\s+(\\d+)\\s+(\\d+)$`);
const ATIVIDADE_ROW = /^(ATV\d{3})\s+(.+?)\s+(?:\d+\s+)?OBRIGATORIA\s+(\d+)$/;
const TRAILING_PREREQ_CODES = new RegExp(`(?:\\s+${CODE})+$`);
const CONTINUATION_LINE = /^[A-ZÀ-ÚÇ()\-,.\s]+$/;
const BOILERPLATE = new Set([
  "MINISTÉRIO DA EDUCAÇÃO",
  "UNIVERSIDADE FEDERAL DE OURO PRETO",
  "PRÓ-REITORIA DE GRADUAÇÃO",
]);

type Section = "obrigatoria" | "eletiva" | "atividade" | null;

async function extractLines(file: File): Promise<string[]> {
  const pdfjsLib = await import("pdfjs-dist");
  const PdfWorker = (await import("pdfjs-dist/build/pdf.worker.min.mjs?worker")).default;
  pdfjsLib.GlobalWorkerOptions.workerPort = new PdfWorker();

  const buffer = await file.arrayBuffer();
  const doc = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;

  const lines: string[] = [];

  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    const page = await doc.getPage(pageNum);
    const content = await page.getTextContent();

    const rows = new Map<number, { x: number; str: string }[]>();
    for (const item of content.items) {
      if (!("str" in item) || !item.str.trim()) continue;
      const y = Math.round(item.transform[5]);
      let key = y;
      for (const existingY of rows.keys()) {
        if (Math.abs(existingY - y) <= 2) {
          key = existingY;
          break;
        }
      }
      const row = rows.get(key) ?? [];
      row.push({ x: item.transform[4], str: item.str });
      rows.set(key, row);
    }

    const pageLines = [...rows.entries()]
      .sort((a, b) => b[0] - a[0])
      .map(([, parts]) =>
        parts
          .sort((a, b) => a.x - b.x)
          .map((p) => p.str)
          .join(" ")
          .replace(/\s+/g, " ")
          .trim(),
      );

    lines.push(...pageLines);
  }

  return lines;
}

export async function parseCurriculumMatrixPdf(file: File): Promise<ParsedCurriculumMatrix> {
  const lines = await extractLines(file);

  const obrigatorias: ParsedCurriculumRow[] = [];
  const atividades: ParsedCurriculumRow[] = [];
  const electiveOptions: ElectiveOption[] = [];

  let section: Section = null;
  // Continua válido só enquanto a linha seguinte for mesmo uma continuação de
  // nome — qualquer outra linha (ruído, cabeçalho, nova disciplina) invalida,
  // pra uma nota de rodapé tipo "1200 horas" não grudar no nome anterior.
  let lastEntry: { name: string } | null = null;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      lastEntry = null;
      continue;
    }
    if (BOILERPLATE.has(line) || line.startsWith("CAMPUS") || line.startsWith("CURSO DE")) {
      lastEntry = null;
      continue;
    }
    if (line.includes("DISCIPLINAS OBRIGATÓRIAS")) {
      section = "obrigatoria";
      lastEntry = null;
      continue;
    }
    if (line.includes("DISCIPLINAS ELETIVAS")) {
      section = "eletiva";
      lastEntry = null;
      continue;
    }
    if (line.startsWith("CÓDIGO ATIVIDADES")) {
      section = "atividade";
      lastEntry = null;
      continue;
    }
    if (line === "T P") {
      lastEntry = null;
      continue;
    }
    if (line.startsWith("CHS - Carga") || line === "Período") {
      lastEntry = null;
      continue;
    }

    if (section === "obrigatoria") {
      const match = OBRIGATORIA_ROW.exec(line);
      if (match) {
        const [, code, middle, chs, , , , , per] = match;
        const entry: ParsedCurriculumRow = {
          code,
          name: middle.replace(TRAILING_PREREQ_CODES, "").trim(),
          workload: Number(chs),
          suggestedPeriod: Number(per),
        };
        obrigatorias.push(entry);
        lastEntry = entry;
        continue;
      }
    }

    if (section === "eletiva") {
      const match = ELETIVA_ROW.exec(line);
      if (match) {
        const [, code, middle, chs] = match;
        const entry: ElectiveOption = {
          code,
          name: middle.replace(TRAILING_PREREQ_CODES, "").trim(),
          workload: Number(chs),
        };
        electiveOptions.push(entry);
        lastEntry = entry;
        continue;
      }
    }

    if (section === "atividade") {
      const match = ATIVIDADE_ROW.exec(line);
      if (match) {
        const [, code, name, chs] = match;
        const entry: ParsedCurriculumRow = { code, name: name.trim(), workload: Number(chs), suggestedPeriod: null };
        atividades.push(entry);
        lastEntry = entry;
        continue;
      }
    }

    if (lastEntry && line.length > 1 && CONTINUATION_LINE.test(line)) {
      lastEntry.name = `${lastEntry.name} ${line}`;
      continue;
    }
    lastEntry = null;
  }

  return { obrigatorias, atividades, electiveOptions };
}

// Catálogo de eletivas disponíveis (pra preencher as vagas "Eletiva N") —
// não é persistido no backend (não é algo que o usuário "tem", é só a lista
// de opções do curso), então fica cacheado no localStorage por conta, mesmo
// raciocínio de recallInstitutionMapping em offeringsImport.ts.
const ELECTIVE_OPTIONS_KEY_PREFIX = "notary:curriculumElectiveOptions:";

export function rememberElectiveOptions(userId: number, options: ElectiveOption[]): void {
  try {
    localStorage.setItem(`${ELECTIVE_OPTIONS_KEY_PREFIX}${userId}`, JSON.stringify(options));
  } catch {
    // localStorage indisponível (modo privado, quota) — não é crítico, só perde o catálogo até reimportar
  }
}

export function recallElectiveOptions(userId: number): ElectiveOption[] {
  try {
    const raw = localStorage.getItem(`${ELECTIVE_OPTIONS_KEY_PREFIX}${userId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
