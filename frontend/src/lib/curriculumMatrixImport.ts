// Importa a matriz curricular oficial (PDF que a PRÓ-REITORIA DE GRADUAÇÃO da
// UFOP disponibiliza por curso) — só a tabela "DISCIPLINAS OBRIGATÓRIAS":
// eletivas/atividades ficam de fora porque não são "tudo obrigatório", o que
// quebraria o cálculo de % concluído (ver applyCurriculumMatrix.ts).
//
// A tabela é bem comportada (célula por célula, não texto livre como o plano
// de ensino), mas nomes longos quebram em 2 linhas (ex: "FUNDAMENTOS DE
// ORGANIZACAO E ARQUITETURA DE" / "COMPUTADORES") — a linha de continuação
// não tem código nem dígito, então dá pra distinguir de ruído tipo "1200
// horas" (nota de pré-requisito de PROJETO INTEGRADOR/TCC, sem dígito não
// teria como confundir com nome de disciplina em maiúsculas).

export type ParsedCurriculumRow = {
  code: string;
  name: string;
  workload: number;
  suggestedPeriod: number;
};

const CODE = "[A-Z]{2,6}\\d{2,4}";
const OBRIGATORIA_ROW = new RegExp(`^(${CODE})\\s+(.+?)\\s+(\\d+)\\/(\\d+)\\s+(\\d+)\\s+(\\d+)\\s+(\\d+)\\s+(\\d+)$`);
const TRAILING_PREREQ_CODES = new RegExp(`(?:\\s+${CODE})+$`);
const CONTINUATION_LINE = /^[A-ZÀ-ÚÇ()\-,.\s]+$/;
const BOILERPLATE = new Set([
  "MINISTÉRIO DA EDUCAÇÃO",
  "UNIVERSIDADE FEDERAL DE OURO PRETO",
  "PRÓ-REITORIA DE GRADUAÇÃO",
]);

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

export async function parseCurriculumMatrixPdf(file: File): Promise<ParsedCurriculumRow[]> {
  const lines = await extractLines(file);

  const entries: ParsedCurriculumRow[] = [];
  let inObrigatorias = false;
  // Continua válida só enquanto a linha seguinte for mesmo uma continuação de
  // nome — qualquer outra linha (ruído, cabeçalho, nova disciplina) invalida,
  // pra uma nota de rodapé tipo "1200 horas" não grudar no nome anterior.
  let lastEntry: ParsedCurriculumRow | null = null;

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
      inObrigatorias = true;
      lastEntry = null;
      continue;
    }
    if (line.includes("DISCIPLINAS ELETIVAS") || line.startsWith("CÓDIGO ATIVIDADES")) {
      inObrigatorias = false;
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

    if (inObrigatorias) {
      const match = OBRIGATORIA_ROW.exec(line);
      if (match) {
        const [, code, middle, chs, , , , , per] = match;
        const name = middle.replace(TRAILING_PREREQ_CODES, "").trim();
        const entry: ParsedCurriculumRow = {
          code,
          name,
          workload: Number(chs),
          suggestedPeriod: Number(per),
        };
        entries.push(entry);
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

  return entries;
}
