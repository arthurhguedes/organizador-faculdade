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

export async function parseHistoricoPdf(file: File): Promise<ParsedHistorico> {
  const lines = await extractLines(file);

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
