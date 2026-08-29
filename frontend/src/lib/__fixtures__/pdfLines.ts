import type { PdfLine } from "../planoDeEnsinoImport";

// Construtor de fixtures pros parsers que dependem de posição (`planoDeEnsinoImport`).
//
// As fixtures guardam o texto **já extraído** do PDF, nunca o PDF: o teste não
// precisa do `pdfjs-dist` e o repositório (que é público) não ganha uma cópia do
// plano de ensino real, com nome de professor e datas de prova de verdade. Todos
// os dados abaixo são fictícios, mas a **geometria** reproduz a dos PDFs reais,
// que é justamente onde a heurística do parser é frágil.
//
// Convenção de `gap` (distância vertical até a linha anterior), calibrada pelos
// PDFs reais e replicada aqui:
//   - `SAME_CELL_GAP` (9pt): a linha pertence à mesma célula da linha anterior
//     (conteúdo previsto que quebrou em mais de uma linha visual)
//   - `NEW_ROW_GAP` (15pt): começa uma nova linha de tabela
export const SAME_CELL_GAP = 9;
export const NEW_ROW_GAP = 15;

/** Uma linha visual do PDF: cada célula é um par `[x, texto]`. */
export type FixtureRow = {
  /** Distância vertical até a linha anterior. Default: `NEW_ROW_GAP`. */
  gap?: number;
  /** Página em que a linha está. Default: a mesma da linha anterior. */
  page?: number;
  cells: Array<[x: number, text: string]>;
};

/**
 * Transforma linhas declaradas de cima pra baixo em `PdfLine[]`, atribuindo
 * `y` decrescente (no PDF o y cresce pra cima, então "mais abaixo na página" =
 * y menor — mesma ordem que `extractLines` produz).
 */
export function buildPdfLines(rows: FixtureRow[], startY = 780): PdfLine[] {
  const lines: PdfLine[] = [];
  let y = startY;
  let page = 1;

  for (const row of rows) {
    if (row.page !== undefined && row.page !== page) {
      page = row.page;
      y = startY; // nova página recomeça do topo
    } else {
      y -= row.gap ?? NEW_ROW_GAP;
    }

    const items = [...row.cells]
      .sort((a, b) => a[0] - b[0])
      .map(([x, str]) => ({ x, str }));

    lines.push({
      page,
      y,
      items,
      text: items
        .map((i) => i.str)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim(),
    });
  }

  return lines;
}

/** Atalho pra uma linha de uma célula só (parágrafo em prosa, heading). */
export function textRow(text: string, gap = NEW_ROW_GAP, x = 60): FixtureRow {
  return { gap, cells: [[x, text]] };
}
