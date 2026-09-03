export type HistoricoEntry = {
  anoSem: string;
  code: string;
  disciplina: string;
  workloadHours: number | null;
  media: number | null;
  situacao: string;
};

export type HistoricoProfessor = {
  anoSem: string;
  code: string;
  professorName: string;
};

export type ParsedHistorico = {
  entries: HistoricoEntry[];
  professors: HistoricoProfessor[];
};

const ENTRY_PATTERN =
  /^(\d{4}\/\d)\s+([A-Z]{2,6}[0-9]{2,4})\s*-\s*(.+?)\s+(\d+)\/(\d+)\s+([\d.]+)\s+(\d+\/\d+)\s+([A-Z]{2})$/;
const PROFESSOR_PATTERN = /^(\d{4}\/\d)\s+([A-Z]{2,6}[0-9]{2,4})\s+(.+?)\s*(?:\([TP+]+\))?$/;

// Um arquivo do iCloud/Google Drive selecionado antes de terminar de baixar
// no aparelho chega aqui como um File "placeholder" quase vazio — vira PDF
// inválido no pdf.js, indistinguível de corrupção real sem essa checagem.
const MIN_VALID_PDF_BYTES = 1024;

export class HistoricoReadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "HistoricoReadError";
  }
}

async function extractLines(file: File): Promise<string[]> {
  const pdfjsLib = await import("pdfjs-dist");
  const PdfWorker = (await import("pdfjs-dist/build/pdf.worker.min.mjs?worker")).default;
  pdfjsLib.GlobalWorkerOptions.workerPort = new PdfWorker();

  const buffer = await file.arrayBuffer();
  if (buffer.byteLength < MIN_VALID_PDF_BYTES) {
    throw new HistoricoReadError(
      "O arquivo chegou vazio ou incompleto — se ele estiver no iCloud/Google Drive, abra-o no app de Arquivos pra baixar por completo antes de importar.",
    );
  }

  let doc;
  try {
    doc = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;
  } catch (err) {
    if (err instanceof pdfjsLib.PasswordException) {
      throw new HistoricoReadError("Esse PDF está protegido por senha — remova a senha e tente importar de novo.");
    }
    if (err instanceof pdfjsLib.InvalidPDFException) {
      throw new HistoricoReadError(
        "Não consegui abrir esse arquivo como PDF — se ele veio do iCloud/Google Drive, confira se terminou de baixar por completo antes de importar.",
      );
    }
    throw err;
  }

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

// Separado de `parseHistoricoPdf` pra deixar o casamento das regexes testável a
// partir de linhas já extraídas, sem `pdfjs-dist` nem o PDF real (que tem nome,
// matrícula e notas do usuário) — ver `historicoImport.test.ts`.
export function parseHistoricoLines(lines: string[]): ParsedHistorico {
  const entries: HistoricoEntry[] = [];
  const professors: HistoricoProfessor[] = [];

  for (const line of lines) {
    const entryMatch = ENTRY_PATTERN.exec(line);
    if (entryMatch) {
      const [, anoSem, code, disciplina, chs, , media, , situacao] = entryMatch as unknown as [
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
      ];
      entries.push({
        anoSem,
        code,
        disciplina: disciplina.trim(),
        workloadHours: Number(chs) || null,
        media: Number(media) || null,
        situacao,
      });
      continue;
    }

    const profMatch = PROFESSOR_PATTERN.exec(line);
    if (profMatch) {
      const [, anoSem, code, professorName] = profMatch as unknown as [string, string, string, string];
      professors.push({ anoSem, code, professorName: professorName.trim() });
    }
  }

  return { entries, professors };
}

export async function parseHistoricoPdf(file: File): Promise<ParsedHistorico> {
  return parseHistoricoLines(await extractLines(file));
}
