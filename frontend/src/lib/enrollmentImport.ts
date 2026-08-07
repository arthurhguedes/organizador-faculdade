export type EnrollmentEntry = {
  code: string;
  turma: string;
  rawLabel: string;
};

const ENTRY_PATTERN = /^([A-Z]{2,6}[0-9]{2,4})\s+([0-9]{1,3})\s+(.+)$/;
const TRAILING_LANGUAGE = /\s+(PORTUGUES|INGLES|ESPANHOL|FRANCES|ALEMAO)$/;

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

    // Text items come with x/y positions but not grouped into rows — reconstruct
    // lines by clustering items whose baseline y is close together.
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
      .sort((a, b) => b[0] - a[0]) // PDF y grows upward — descending y = top to bottom
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

export async function parseEnrollmentPdf(file: File): Promise<EnrollmentEntry[]> {
  const lines = await extractLines(file);
  const entries: EnrollmentEntry[] = [];
  const seen = new Set<string>();

  for (const line of lines) {
    const match = ENTRY_PATTERN.exec(line);
    if (!match) continue;
    const [, code, turma, rest] = match as unknown as [string, string, string, string];
    const key = `${code}-${turma}`;
    if (seen.has(key)) continue;
    seen.add(key);
    entries.push({ code, turma, rawLabel: rest.replace(TRAILING_LANGUAGE, "").trim() });
  }

  return entries;
}
