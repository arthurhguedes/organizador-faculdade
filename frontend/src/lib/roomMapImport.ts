// Importa o PDF "Mapa de Salas" (S.A.S. — Sistema de Alocação de Salas da
// UFOP): um export público, uma página por sala, com uma grade dia-da-semana
// x horário e o que está alocado em cada célula (código+turma, disciplina,
// professor+tipo). Ao contrário do Plano de Ensino (uma tabela de uma
// coluna), aqui é uma tabela 2D de verdade — colunas diferentes da mesma
// linha da tabela costumam compartilhar exatamente a mesma altura (Y) na
// primeira linha da célula, então agrupar texto só por Y (como nos outros
// parsers de PDF do projeto) mistura o conteúdo de dias diferentes numa
// linha só. Por isso as colunas são separadas primeiro por X (âncoras do
// cabeçalho de dias) e só depois cada coluna tem suas próprias linhas
// reconstruídas por Y — nessa ordem, nunca o contrário.
export type ParsedRoomAllocation = {
  room: string;
  roomCapacity: number | null;
  semesterLabel: string | null;
  subjectCode: string | null;
  turma: string | null;
  subjectName: string;
  professorName: string | null;
  weekday: string;
  startTime: string;
  endTime: string;
  kind: "T" | "P" | "T+P" | null;
};

type PdfItem = { x: number; y: number; str: string };
type PdfLine = { y: number; items: PdfItem[]; text: string };

const ROOM_HEADER = /^Sala\s+(\S+)\s*[·•]\s*Capacidade\s+(\d+)\s+lugares?\s*[·•]\s*Semestre\s+(\S+)/i;
const DAY_HEADER_START = /^Hor[aá]rio\b/i;
const FOOTER = /S\.A\.S\.?\s*[—-]\s*Sistema de Aloca[çc][ãa]o de Salas\s*[·•]\s*NTI/i;
const TIME_RANGE = /^(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})$/;
const CODE_TURMA = /^(\S+)\s+(\S+)$/;
const PROFESSOR_KIND = /^(.+?)\s*\(((?:T\+P)|T|P)\)$/i;

const DAY_NAME_TO_WEEKDAY: Record<string, string> = {
  segunda: "segunda",
  terca: "terça",
  quarta: "quarta",
  quinta: "quinta",
  sexta: "sexta",
  sabado: "sábado",
};

function stripDiacritics(text: string): string {
  return Array.from(text.normalize("NFD"))
    .filter((char) => char.codePointAt(0)! < 128)
    .join("");
}

function normalizeTime(raw: string): string {
  const [h, m] = raw.split(":");
  return `${h.padStart(2, "0")}:${m}`;
}

function clusterByY(items: PdfItem[], tolerance = 2): PdfLine[] {
  const rows = new Map<number, PdfItem[]>();
  for (const item of items) {
    let key = item.y;
    for (const existingY of rows.keys()) {
      if (Math.abs(existingY - item.y) <= tolerance) {
        key = existingY;
        break;
      }
    }
    const row = rows.get(key) ?? [];
    row.push(item);
    rows.set(key, row);
  }
  return [...rows.entries()]
    .sort((a, b) => b[0] - a[0]) // y cresce pra cima no PDF — ordem decrescente = topo pra baixo
    .map(([y, parts]) => {
      const sorted = parts.sort((a, b) => a.x - b.x);
      return {
        y,
        items: sorted,
        text: sorted
          .map((p) => p.str)
          .join(" ")
          .replace(/\s+/g, " ")
          .trim(),
      };
    });
}

async function extractPages(file: File): Promise<PdfItem[][]> {
  const pdfjsLib = await import("pdfjs-dist");
  const PdfWorker = (await import("pdfjs-dist/build/pdf.worker.min.mjs?worker")).default;
  pdfjsLib.GlobalWorkerOptions.workerPort = new PdfWorker();

  const buffer = await file.arrayBuffer();
  const doc = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;

  const pages: PdfItem[][] = [];
  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    const page = await doc.getPage(pageNum);
    const content = await page.getTextContent();
    const items: PdfItem[] = [];
    for (const item of content.items) {
      if (!("str" in item) || !item.str.trim()) continue;
      items.push({ x: item.transform[4], y: Math.round(item.transform[5]), str: item.str });
    }
    pages.push(items);
  }
  return pages;
}

function deriveColumnAnchors(items: PdfItem[], tolerance = 20): number[] {
  const xs = items.map((i) => i.x).sort((a, b) => a - b);
  const anchors: number[] = [];
  for (const x of xs) {
    if (anchors.length === 0 || x - anchors[anchors.length - 1] > tolerance) {
      anchors.push(x);
    }
  }
  return anchors;
}

function nearestIndex(value: number, anchors: number[]): number {
  let best = 0;
  let bestDist = Math.abs(value - anchors[0]);
  for (let i = 1; i < anchors.length; i++) {
    const dist = Math.abs(value - anchors[i]);
    if (dist < bestDist) {
      best = i;
      bestDist = dist;
    }
  }
  return best;
}

// Uma célula pode quebrar em várias linhas visuais (código+turma, nome da
// disciplina em 1-2 linhas, professor+tipo) — parseia o bloco já reconstruído
// de cima pra baixo.
function parseCell(lines: string[]): Pick<
  ParsedRoomAllocation,
  "subjectCode" | "turma" | "subjectName" | "professorName" | "kind"
> {
  const [first, ...rest] = lines;

  if (first.trim().toUpperCase() === "RESERVA") {
    return {
      subjectCode: null,
      turma: null,
      subjectName: rest.join(" ").replace(/\s+/g, " ").trim() || "Reserva",
      professorName: null,
      kind: null,
    };
  }

  const codeMatch = CODE_TURMA.exec(first.trim());
  const subjectCode = codeMatch ? codeMatch[1] : null;
  const turma = codeMatch ? codeMatch[2] : null;
  const contentLines = codeMatch ? rest : lines;

  const last = contentLines[contentLines.length - 1] ?? "";
  const professorMatch = PROFESSOR_KIND.exec(last.trim());
  const professorName = professorMatch ? professorMatch[1].trim() : null;
  const kind = professorMatch ? (professorMatch[2].toUpperCase() as "T" | "P" | "T+P") : null;
  const nameLines = professorMatch ? contentLines.slice(0, -1) : contentLines;

  return {
    subjectCode,
    turma,
    subjectName: nameLines.join(" ").replace(/\s+/g, " ").trim() || "—",
    professorName,
    kind,
  };
}

function parseRoomPage(items: PdfItem[]): ParsedRoomAllocation[] {
  const fullLines = clusterByY(items);

  const headerLine = fullLines.find((l) => ROOM_HEADER.test(l.text));
  const headerMatch = headerLine ? ROOM_HEADER.exec(headerLine.text)! : null;
  if (!headerMatch) return [];
  const [, room, capacityRaw, semesterLabel] = headerMatch;
  const roomCapacity = Number(capacityRaw) || null;

  const dayHeaderLine = fullLines.find((l) => DAY_HEADER_START.test(l.text));
  if (!dayHeaderLine) return [];

  const columnAnchors = deriveColumnAnchors(dayHeaderLine.items);
  if (columnAnchors.length < 2) return [];

  // Mapeia cada âncora de coluna (exceto a 0, que é "Horário") pro dia da
  // semana pelo texto do item de cabeçalho naquela âncora.
  const columnWeekday = new Map<number, string>();
  for (const item of dayHeaderLine.items) {
    const col = nearestIndex(item.x, columnAnchors);
    if (col === 0) continue;
    const key = stripDiacritics(item.str).toLowerCase();
    const weekday = DAY_NAME_TO_WEEKDAY[key];
    if (weekday) columnWeekday.set(col, weekday);
  }

  const footerLine = fullLines.find((l) => FOOTER.test(l.text));
  const bodyItems = items.filter(
    (it) => it.y < dayHeaderLine.y && (!footerLine || it.y > footerLine.y),
  );

  // Marcadores de linha (horário) vêm só da coluna 0 — isolando por X antes
  // de reagrupar por Y evita que o marcador "grude" no conteúdo de uma
  // coluna vizinha que comece exatamente na mesma altura.
  const col0Lines = clusterByY(bodyItems.filter((it) => nearestIndex(it.x, columnAnchors) === 0));
  const rowMarkers = col0Lines
    .map((l) => ({ y: l.y, match: TIME_RANGE.exec(l.text) }))
    .filter((r): r is { y: number; match: RegExpExecArray } => Boolean(r.match))
    .map((r) => ({ y: r.y, startTime: normalizeTime(r.match[1]), endTime: normalizeTime(r.match[2]) }));
  if (rowMarkers.length === 0) return [];

  const entries: ParsedRoomAllocation[] = [];
  for (const [col, weekday] of columnWeekday) {
    const colItems = bodyItems.filter((it) => nearestIndex(it.x, columnAnchors) === col);
    const colLines = clusterByY(colItems); // reconstrói as linhas da célula só dentro desta coluna

    const buckets = new Map<number, string[]>();
    for (const line of colLines) {
      let closestRow = 0;
      let closestDist = Math.abs(line.y - rowMarkers[0].y);
      for (let i = 1; i < rowMarkers.length; i++) {
        const dist = Math.abs(line.y - rowMarkers[i].y);
        if (dist < closestDist) {
          closestRow = i;
          closestDist = dist;
        }
      }
      const bucket = buckets.get(closestRow) ?? [];
      bucket.push(line.text);
      buckets.set(closestRow, bucket);
    }

    for (const [rowIdx, cellLines] of buckets) {
      const row = rowMarkers[rowIdx];
      const cell = parseCell(cellLines);
      entries.push({
        room,
        roomCapacity,
        semesterLabel,
        weekday,
        startTime: row.startTime,
        endTime: row.endTime,
        ...cell,
      });
    }
  }

  return entries;
}

export async function parseRoomMapPdf(file: File): Promise<ParsedRoomAllocation[]> {
  const pages = await extractPages(file);
  return pages.flatMap(parseRoomPage);
}
