export type SyllabusPdfEntry = {
  lessonNumber: number | null; // per_aula only
  kind: "T" | "P" | null; // per_aula only
  date: string | null; // per_aula only, YYYY-MM-DD
  weekNumber: number | null; // weekly only
  periodLabel: string | null; // weekly only, texto cru do intervalo, ex: "24-28/ago"
  content: string;
};

export type SyllabusPdfTopic = { code: string; title: string; position: number };

export type SyllabusPdfAssessment = {
  title: string;
  weightLabel: string | null;
  dateLabel: string | null;
  coverageLabel: string | null;
  position: number;
};

export type SyllabusPdfImport = {
  format: "per_aula" | "weekly";
  entries: SyllabusPdfEntry[];
  topics: SyllabusPdfTopic[];
  assessments: SyllabusPdfAssessment[];
};

type PdfItem = { x: number; str: string };
type PdfLine = { page: number; y: number; text: string; items: PdfItem[] };

// Linha de aula do cronograma aula-a-aula: "16 Teórica 21/05/2026 1ª Prova
// Teórica" — número, tipo (Teórica/Prática/"-" pra feriado), data, início do
// conteúdo. Só casa nesse formato (data completa dd/mm/aaaa); PDFs no formato
// semanal (sem ano no "Período") nunca batem aqui, o que é usado pra
// autodetectar o formato sem risco de regressão no já validado.
const ROW_START = /^(\d{1,3})\s+([^\d]+?)\s+(\d{2})\/(\d{2})\/(\d{4})\s*(.*)$/;

// Ancorado no início da linha: evita casar menções soltas a "cronograma" no
// meio de outros parágrafos do documento (ex: "...e no cronograma da
// disciplina." no texto de Avaliação), só o heading da seção mesmo.
const CRONOGRAMA_START = /^cronograma\b/i;
const CRONOGRAMA_END = /^(bibliografia|hor[aá]rio de aula)/i;

const TOPICS_START = /^conte[uú]do program[aá]tico:?/i;
const TOPICS_END = /^objetivos:?/i;
const TOPIC_LINE = /^(\d+(?:\.\d+)*)\.?\s+(.+)$/;

const AVALIACAO_TABLE_START = /^descri[çc][aã]o da\b/i;
const HEADING_CRONOGRAMA = /^cronograma$/i;

// Formato em prosa (sem tabela) da seção de avaliação: heading "Atividades
// avaliativas:" seguido de itens com marcador "•", ex: "• Prova 1 - 10,0
// pontos (P1) - dia 29/09/2026". Mesmo raciocínio do SEMANA_LIST — nem toda
// faculdade usa a tabela "Descrição da avaliação | Peso | Data | Conteúdo".
const ATIVIDADES_AVALIATIVAS_START = /^atividades avaliativas:?$/i;
// Linha de fórmula, ex: "Nota final = (P1x0,3) + (P2x0,3) + (E1x0,1) + (TFx0,3)".
// "10,0 pontos" na linha do item é só a nota máxima daquela avaliação, não o
// peso real na média — o peso de verdade é a fração aqui, por sigla.
const NOTA_FINAL_LINE = /^nota final\b/i;
const NOTA_FINAL_TERM = /([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ0-9]*)\s*[xX]\s*(\d+(?:[.,]\d+)?)/g;
const BULLET_PREFIX = /^[•]\s*/;
// Sigla entre parênteses que identifica o item na fórmula acima, ex: "(P1)".
const ABBR_IN_PARENS = /\(([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ0-9]*)\)/;

const WEEK_HEADER = /^semana\b/i;
const WEEK_NUMBER = /^\d{1,3}$/;

// Formato semanal em prosa (sem tabela): cada semana é um parágrafo só,
// "Semana NN (período): conteúdo previsto." — nem toda faculdade estrutura o
// cronograma como tabela; esse layout usa parênteses pro período em vez de
// coluna própria. Âncora no início da linha pra não casar menções soltas a
// "Semana NN" no meio do conteúdo (ex: "Reposição das aulas na Semana 15").
const SEMANA_LIST = /^semana\s+(\d{1,3})\s*(?:\(([^)]*)\))?\s*:?\s*(.*)$/i;

// Linhas dentro da mesma célula (conteúdo previsto que quebra em mais de uma
// linha) ficam bem mais próximas verticalmente entre si (~9pt neste layout)
// do que uma linha de tabela para a próxima (~14-15pt) — usa isso pra
// reagrupar linhas quebradas de volta na mesma célula/linha de tabela.
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
    const rows = new Map<number, PdfItem[]>();
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
      .map(([y, parts]) => {
        const items = parts.sort((a, b) => a.x - b.x);
        return {
          page: pageNum,
          y,
          items,
          text: items
            .map((p) => p.str)
            .join(" ")
            .replace(/\s+/g, " ")
            .trim(),
        };
      });

    lines.push(...pageLines);
  }

  return lines;
}

function clusterRows(lines: PdfLine[], maxGap: number): PdfLine[][] {
  const clusters: PdfLine[][] = [];
  let prev: PdfLine | null = null;
  for (const line of lines) {
    const gap = prev && prev.page === line.page ? prev.y - line.y : null;
    if (gap === null || gap > maxGap) {
      clusters.push([line]);
    } else {
      clusters[clusters.length - 1].push(line);
    }
    prev = line;
  }
  return clusters;
}

// Deriva as posições x das colunas de uma tabela a partir do(s) cluster(s) de
// cabeçalho, em vez de fixar valores — tolera pequenas variações de layout
// entre PDFs de outras matérias/professores.
function deriveColumnAnchors(headerLines: PdfLine[], tolerance = 20): number[] {
  const xs = headerLines
    .flatMap((l) => l.items.map((i) => i.x))
    .sort((a, b) => a - b);
  const anchors: number[] = [];
  for (const x of xs) {
    if (anchors.length === 0 || x - anchors[anchors.length - 1] > tolerance) {
      anchors.push(x);
    }
  }
  return anchors;
}

function nearestAnchorIndex(x: number, anchors: number[]): number {
  let best = 0;
  let bestDist = Math.abs(x - anchors[0]);
  for (let i = 1; i < anchors.length; i++) {
    const dist = Math.abs(x - anchors[i]);
    if (dist < bestDist) {
      best = i;
      bestDist = dist;
    }
  }
  return best;
}

// Agrupa os itens de um bloco de linhas (uma linha de tabela, possivelmente
// quebrada em várias linhas visuais) em colunas pela âncora de x mais
// próxima. Necessário pras tabelas Avaliação/Cronograma semanal porque,
// diferente do cronograma aula-a-aula, o conteúdo quebrado não fica sempre
// "tudo depois da linha-marcador" — colunas diferentes podem quebrar em
// linhas visuais diferentes dentro do mesmo bloco.
function binCluster(cluster: PdfLine[], anchors: number[]): string[] {
  const columns: { x: number; y: number; str: string }[][] = anchors.map(() => []);
  for (const line of cluster) {
    for (const item of line.items) {
      columns[nearestAnchorIndex(item.x, anchors)].push({ x: item.x, y: line.y, str: item.str });
    }
  }
  return columns.map((col) =>
    col
      .sort((a, b) => b.y - a.y || a.x - b.x)
      .map((i) => i.str)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim(),
  );
}

// Formato aula-a-aula: cada linha do cronograma é uma aula (número, tipo,
// data cheia). Quando o conteúdo previsto quebra em mais de uma linha visual,
// a célula "Aula/Data" fica centralizada verticalmente na altura da célula de
// conteúdo — ou seja, a linha com o número da aula nem sempre é a primeira
// linha do bloco, pode vir no meio. Por isso o agrupamento não pode ser "a
// linha que começa com número inicia um registro novo, o resto pertence ao
// registro anterior": em vez disso, agrupa linhas em blocos por proximidade
// vertical e, dentro de cada bloco, procura a linha com o marcador de aula
// pra extrair número/tipo/data, concatenando as demais linhas do bloco como
// conteúdo.
function parsePerAulaCronograma(cronogramaLines: PdfLine[]): SyllabusPdfEntry[] {
  const clusters = clusterRows(cronogramaLines, SAME_ROW_MAX_GAP);

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
      weekNumber: null,
      periodLabel: null,
      content,
    });
  }

  return entries;
}

// Formato semanal: cabeçalho "Semana | Período | Descrição", cada linha do
// cronograma é uma semana (período em texto livre, sem ano — ex:
// "24-28/ago"). Diferente do cronograma aula-a-aula, o espaçamento vertical
// entre linhas de uma mesma célula não é consistentemente menor que o
// espaçamento entre linhas de semanas diferentes neste layout — uma célula
// com 3+ tópicos pode usar o mesmo espaçamento de "nova linha de tabela" que
// separa duas semanas (ex: a célula da semana 15 lista 3 tópicos com o mesmo
// gap vertical de ~14-15pt que existe entre semanas normais). Clustering por
// proximidade vertical sozinho perderia conteúdo nesse caso. Em vez disso,
// cada linha é individualmente colocada em coluna por x; a coluna "Semana"
// identifica as linhas-âncora (uma por semana); qualquer linha sem marcador
// de semana é anexada à linha-âncora mais próxima verticalmente (podendo vir
// antes OU depois dela no PDF — mesmo raciocínio do formato aula-a-aula, em
// que o marcador nem sempre é a primeira linha do bloco).
function parseWeeklyCronograma(cronogramaLines: PdfLine[]): SyllabusPdfEntry[] {
  const headerIndex = cronogramaLines.findIndex((l) => WEEK_HEADER.test(l.text));
  if (headerIndex === -1) return [];

  const anchors = deriveColumnAnchors([cronogramaLines[headerIndex]]);
  if (anchors.length < 3) return [];

  const dataLines = cronogramaLines.slice(headerIndex + 1);
  const binned = dataLines.map((line) => ({
    page: line.page,
    y: line.y,
    columns: binCluster([line], anchors),
  }));

  const weekLineIndexes = binned
    .map((row, i) => (WEEK_NUMBER.test(row.columns[0]) ? i : -1))
    .filter((i) => i !== -1);
  if (weekLineIndexes.length === 0) return [];

  function nearestWeekLine(i: number): number {
    let best = weekLineIndexes[0];
    let bestDist = Infinity;
    for (const a of weekLineIndexes) {
      const pageDist = Math.abs(binned[i].page - binned[a].page) * 100000;
      const dist = pageDist + Math.abs(binned[i].y - binned[a].y);
      if (dist < bestDist) {
        best = a;
        bestDist = dist;
      }
    }
    return best;
  }

  const buckets = new Map<number, { period: string[]; content: string[] }>();
  for (const i of weekLineIndexes) buckets.set(i, { period: [], content: [] });

  binned.forEach((row, i) => {
    const target = weekLineIndexes.includes(i) ? i : nearestWeekLine(i);
    const bucket = buckets.get(target)!;
    if (row.columns[1]) bucket.period.push(row.columns[1]);
    if (row.columns[2]) bucket.content.push(row.columns[2]);
  });

  const entries: SyllabusPdfEntry[] = [];
  for (const i of weekLineIndexes) {
    const bucket = buckets.get(i)!;
    const content = bucket.content.join(" ").replace(/\s+/g, " ").trim();
    if (!content) continue;

    entries.push({
      lessonNumber: null,
      kind: null,
      date: null,
      weekNumber: Number(binned[i].columns[0]),
      periodLabel: bucket.period.join(" ").replace(/\s+/g, " ").trim() || null,
      content,
    });
  }

  return entries;
}

// Fallback do formato semanal quando não há tabela real (ver SEMANA_LIST):
// cada linha que casa "Semana NN (...)" abre um registro novo; linhas que não
// casam (conteúdo que quebrou em mais de uma linha visual, ex: "Reposição das
// / aulas na Semana 15.") são anexadas ao registro aberto mais recente.
function parseWeeklyListCronograma(cronogramaLines: PdfLine[]): SyllabusPdfEntry[] {
  const entries: SyllabusPdfEntry[] = [];
  let current: SyllabusPdfEntry | null = null;

  for (const line of cronogramaLines) {
    const match = SEMANA_LIST.exec(line.text);
    if (match) {
      const [, weekNumber, periodLabel, content] = match;
      current = {
        lessonNumber: null,
        kind: null,
        date: null,
        weekNumber: Number(weekNumber),
        periodLabel: periodLabel?.trim() || null,
        content: content.trim(),
      };
      entries.push(current);
    } else if (current && line.text.trim()) {
      current.content = `${current.content} ${line.text.trim()}`.trim();
    }
  }

  return entries;
}

// Conteúdo programático: lista hierárquica de tópicos, uma linha por tópico
// (não quebra em várias linhas visuais neste layout).
function parseTopics(lines: PdfLine[]): SyllabusPdfTopic[] {
  const startIndex = lines.findIndex((l) => TOPICS_START.test(l.text));
  if (startIndex === -1) return [];
  const relativeEnd = lines.slice(startIndex + 1).findIndex((l) => TOPICS_END.test(l.text));
  const endIndex = relativeEnd === -1 ? lines.length : startIndex + 1 + relativeEnd;

  const topics: SyllabusPdfTopic[] = [];
  let position = 0;
  for (const line of lines.slice(startIndex + 1, endIndex)) {
    const match = TOPIC_LINE.exec(line.text);
    if (!match) continue;
    topics.push({ code: match[1], title: match[2].trim(), position: position++ });
  }
  return topics;
}

// Tabela Avaliação: "Descrição da avaliação | Peso da avaliação (%) | Data |
// Conteúdo avaliado". Peso/data/cobertura às vezes vêm em branco ou como
// texto livre não estruturado (ex: peso do Exame Especial em branco, data
// "Será definido posteriormente" dos Trabalhos), por isso o binning por
// coluna em vez de assumir uma linha só por avaliação.
function parseAvaliacaoTable(lines: PdfLine[]): SyllabusPdfAssessment[] {
  const startIndex = lines.findIndex((l) => AVALIACAO_TABLE_START.test(l.text));
  if (startIndex === -1) return [];
  const relativeEnd = lines.slice(startIndex).findIndex((l) => HEADING_CRONOGRAMA.test(l.text));
  const endIndex = relativeEnd === -1 ? lines.length : startIndex + relativeEnd;

  const headerCluster = clusterRows(lines.slice(startIndex, endIndex), SAME_ROW_MAX_GAP)[0] ?? [];
  const anchors = deriveColumnAnchors(headerCluster);
  if (anchors.length < 4) return [];

  const dataLines = lines.slice(startIndex + headerCluster.length, endIndex);
  const clusters = clusterRows(dataLines, SAME_ROW_MAX_GAP);

  const assessments: SyllabusPdfAssessment[] = [];
  let position = 0;
  for (const cluster of clusters) {
    const [title, weight, date, coverage] = binCluster(cluster, anchors);
    if (!title) continue;
    assessments.push({
      title,
      weightLabel: weight || null,
      dateLabel: date || null,
      coverageLabel: coverage || null,
      position: position++,
    });
  }

  return assessments;
}

// Fallback de "Atividades avaliativas:" em prosa (ver ATIVIDADES_AVALIATIVAS_START):
// cada linha não vazia da seção (exceto a fórmula de nota final) é um item —
// com ou sem marcador "•". Título = antes do primeiro "-"/"–". O peso real
// vem da fórmula "Nota final = (P1x0,3) + ..." (ver NOTA_FINAL_TERM), casado
// pela sigla entre parênteses do item (ex: "(P1)") — não do "N pontos" da
// linha, que é só a nota máxima daquele item, não o peso na média (ex: no PDF
// de referência todos os itens valem "10,0 pontos" apesar de pesos bem
// diferentes: 0,3/0,3/0,1/0,3). O resto da linha (com ou sem data) vira
// dateLabel bruto, deixando a extração de data pro backend
// (`parseAssessmentDate` já procura dd/mm(/aaaa) em qualquer lugar do
// texto). Itens sem sigla reconhecida na fórmula (ex: Exame Especial) ou sem
// data (ex: "ao longo do semestre") ficam com weightLabel/dateLabel null —
// mesma regra da tabela: só vira prova automática quando os dois dão pra
// extrair.
function parseAtividadesAvaliativasList(lines: PdfLine[]): SyllabusPdfAssessment[] {
  const startIndex = lines.findIndex((l) => ATIVIDADES_AVALIATIVAS_START.test(l.text));
  if (startIndex === -1) return [];
  const relativeEnd = lines.slice(startIndex + 1).findIndex((l) => CRONOGRAMA_START.test(l.text));
  const endIndex = relativeEnd === -1 ? lines.length : startIndex + 1 + relativeEnd;
  const sectionLines = lines.slice(startIndex + 1, endIndex);

  const notaFinalLine = sectionLines.find((l) => NOTA_FINAL_LINE.test(l.text.trim()));
  const weightByCode = new Map<string, string>();
  if (notaFinalLine) {
    for (const match of notaFinalLine.text.matchAll(NOTA_FINAL_TERM)) {
      weightByCode.set(match[1].toLowerCase(), match[2]);
    }
  }

  const assessments: SyllabusPdfAssessment[] = [];
  let position = 0;
  for (const line of sectionLines) {
    const text = line.text.trim();
    if (!text || NOTA_FINAL_LINE.test(text)) continue;

    const parts = text
      .replace(BULLET_PREFIX, "")
      .split(/\s+[-–]\s+/)
      .map((p) => p.trim())
      .filter(Boolean);
    if (parts.length === 0) continue;

    const [title, ...rest] = parts;
    const abbrMatch = ABBR_IN_PARENS.exec(text);
    const weightLabel = abbrMatch ? (weightByCode.get(abbrMatch[1].toLowerCase()) ?? null) : null;
    const dateLabel = rest.join(" - ").trim() || null;

    assessments.push({ title, weightLabel, dateLabel, coverageLabel: null, position: position++ });
  }

  return assessments;
}

export async function parsePlanoDeEnsinoPdf(file: File): Promise<SyllabusPdfImport> {
  const lines = await extractLines(file);

  const topics = parseTopics(lines);
  const tableAssessments = parseAvaliacaoTable(lines);
  const assessments = tableAssessments.length > 0 ? tableAssessments : parseAtividadesAvaliativasList(lines);

  const startIndex = lines.findIndex((l) => CRONOGRAMA_START.test(l.text));
  if (startIndex === -1) return { format: "per_aula", entries: [], topics, assessments };

  const relativeEnd = lines.slice(startIndex + 1).findIndex((l) => CRONOGRAMA_END.test(l.text));
  const endIndex = relativeEnd === -1 ? lines.length : startIndex + 1 + relativeEnd;
  const cronogramaLines = lines.slice(startIndex + 1, endIndex);

  const perAulaEntries = parsePerAulaCronograma(cronogramaLines);
  if (perAulaEntries.length > 0) {
    return { format: "per_aula", entries: perAulaEntries, topics, assessments };
  }

  const weeklyTableEntries = parseWeeklyCronograma(cronogramaLines);
  if (weeklyTableEntries.length > 0) {
    return { format: "weekly", entries: weeklyTableEntries, topics, assessments };
  }

  return { format: "weekly", entries: parseWeeklyListCronograma(cronogramaLines), topics, assessments };
}
