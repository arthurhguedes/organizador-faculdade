export type SyllabusPdfEntry = {
  lessonNumber: number;
  kind: "T" | "P" | null;
  date: string; // YYYY-MM-DD
  content: string;
};

type PdfLine = { page: number; y: number; text: string };

// Linha de aula do cronograma: "16 Teórica 21/05/2026 1ª Prova Teórica" —
// número, tipo (Teórica/Prática/"-" pra feriado), data, início do conteúdo.
const ROW_START = /^(\d{1,3})\s+([^\d]+?)\s+(\d{2})\/(\d{2})\/(\d{4})\s*(.*)$/;
const CRONOGRAMA_START = /cronograma/i;
const CRONOGRAMA_END = /^bibliografia/i;

// Linhas dentro da mesma célula (conteúdo previsto que quebra em mais de uma
// linha) ficam bem mais próximas verticalmente entre si (~9pt neste layout)
// do que uma linha de tabela para a próxima (~14-15pt) — usa isso pra
// reagrupar linhas quebradas de volta na mesma aula.
const SAME_ROW_MAX_GAP = 11;

function normalizeKind(raw: string): "T" | "P" | null {
  const lower = raw.toLowerCase();
  if (lower.includes("teór") || lower.includes("teor")) return "T";
  if (lower.includes("prát") || lower.includes("prat")) return "P";
  return null;
}

async function extractLines(file: File): Promise<PdfLine[]> {
  const pdfjsLib = await import("pdfjs-dist");
  const PdfWorker = (await import("pdfjs-dist/build/pdf.worker.min.mjs?worker")).default;
  pdfjsLib.GlobalWorkerOptions.workerPort = new PdfWorker();

  const buffer = await file.arrayBuffer();
  const doc = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;

  const lines: PdfLine[] = [];

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
      .map(([y, parts]) => ({
        page: pageNum,
        y,
        text: parts
          .sort((a, b) => a.x - b.x)
          .map((p) => p.str)
          .join(" ")
          .replace(/\s+/g, " ")
          .trim(),
      }));

    lines.push(...pageLines);
  }

  return lines;
}

// O plano de ensino tem várias tabelas (avaliações, horário de aula etc.) —
// só a tabela "Cronograma" (aula por aula) interessa aqui.
//
// Quando o conteúdo previsto de uma aula quebra em mais de uma linha visual,
// a célula "Aula/Data" fica centralizada verticalmente na altura da célula
// de conteúdo — ou seja, a linha com o número da aula nem sempre é a
// primeira linha do bloco, pode vir no meio. Por isso o agrupamento não pode
// ser "a linha que começa com número inicia um registro novo, o resto
// pertence ao registro anterior": em vez disso, agrupa linhas em blocos por
// proximidade vertical (mesma célula = linhas bem próximas) e, dentro de
// cada bloco, procura a linha com o marcador de aula pra extrair
// número/tipo/data, concatenando as demais linhas do bloco como conteúdo.
export async function parsePlanoDeEnsinoPdf(file: File): Promise<SyllabusPdfEntry[]> {
  const lines = await extractLines(file);

  const startIndex = lines.findIndex((l) => CRONOGRAMA_START.test(l.text));
  if (startIndex === -1) return [];
  const relativeEnd = lines.slice(startIndex + 1).findIndex((l) => CRONOGRAMA_END.test(l.text));
  const endIndex = relativeEnd === -1 ? lines.length : startIndex + 1 + relativeEnd;

  const clusters: PdfLine[][] = [];
  let prev: PdfLine | null = null;
  for (const line of lines.slice(startIndex + 1, endIndex)) {
    const gap = prev && prev.page === line.page ? prev.y - line.y : null;
    if (gap === null || gap > SAME_ROW_MAX_GAP) {
      clusters.push([line]);
    } else {
      clusters[clusters.length - 1].push(line);
    }
    prev = line;
  }

  const entries: SyllabusPdfEntry[] = [];
  for (const cluster of clusters) {
    const markerIndex = cluster.findIndex((l) => ROW_START.test(l.text));
    if (markerIndex === -1) continue; // ex: cabeçalho da tabela

    const match = ROW_START.exec(cluster[markerIndex].text)!;
    const [, lessonNumber, kindRaw, day, month, year, contentStart] = match;

    const parts = cluster.map((l, i) => (i === markerIndex ? contentStart : l.text)).filter((t) => t.trim());
    const content = parts.join(" ").replace(/\s+/g, " ").trim();
    if (!content) continue;

    entries.push({
      lessonNumber: Number(lessonNumber),
      kind: normalizeKind(kindRaw),
      date: `${year}-${month}-${day}`,
      content,
    });
  }

  return entries;
}
