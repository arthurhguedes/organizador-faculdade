import { buildPdfLines, textRow, SAME_CELL_GAP, NEW_ROW_GAP, type FixtureRow } from "./pdfLines";

// Fixtures de plano de ensino. Dados 100% fictícios (matéria, professor, datas
// e notas inventados); o que é reproduzido dos PDFs reais é só a **geometria**:
// quais células quebram em quantas linhas, com que espaçamento vertical, e em
// que ponto a tabela atravessa a quebra de página. Ver `pdfLines.ts`.

// Posições x das colunas da tabela "Avaliação" (4 colunas).
const AVAL_TITLE_X = 60;
const AVAL_WEIGHT_X = 200;
const AVAL_DATE_X = 300;
const AVAL_COVERAGE_X = 380;

// Posições x das colunas do cronograma aula-a-aula.
const LESSON_NUM_X = 60;
const LESSON_KIND_X = 110;
const LESSON_DATE_X = 190;
const LESSON_CONTENT_X = 290;

const SEI_HEADER = "29/08/2026, 14:32 SEI/UFXX - 1234567 - Plano de Ensino";
const SEI_FOOTER = "https://sei.ufxx.br/sei/controlador.php?acao=documento_imprimir_web 2/3";

const AVALIACAO_HEADER: FixtureRow = {
  cells: [
    [AVAL_TITLE_X, "Descrição da avaliação"],
    [AVAL_WEIGHT_X, "Peso da avaliação (%)"],
    [AVAL_DATE_X, "Data"],
    [AVAL_COVERAGE_X, "Conteúdo avaliado"],
  ],
};

/**
 * Formato aula-a-aula com coluna de tipo e data completa (dd/mm/aaaa) — o PDF
 * de referência do projeto. Exercita, em um documento só:
 *  - conteúdo programático + objetivos;
 *  - tabela de avaliação com célula que quebra em 2 linhas, avaliação sem data
 *    real ("Será definido posteriormente") e avaliação sem peso (Exame Especial);
 *  - quebra de página no meio da tabela, com cabeçalho repetido e chrome do SEI;
 *  - seção "Horário de Atendimento" entre a avaliação e o cronograma;
 *  - aula cujo conteúdo quebra em 3 linhas, com a célula "Aula/Data"
 *    centralizada verticalmente (o marcador cai na linha do MEIO do bloco);
 *  - aula de feriado, sem tipo ("-").
 */
export const perAulaFullDate = buildPdfLines([
  textRow(SEI_HEADER),
  textRow("Conteúdo Programático:"),
  textRow("1. Estatística Descritiva"),
  textRow("1.1. Tabelas de frequência"),
  textRow("1.2. Medidas de posição"),
  textRow("2. Probabilidade"),
  textRow("Objetivos:"),
  textRow("Apresentar os conceitos fundamentais de estatística."),

  AVALIACAO_HEADER,
  {
    cells: [
      [AVAL_TITLE_X, "Primeira Prova"],
      [AVAL_WEIGHT_X, "30"],
      [AVAL_DATE_X, "07/10/2026"],
      [AVAL_COVERAGE_X, "Unidades 1 e 2"],
    ],
  },
  {
    cells: [
      [AVAL_TITLE_X, "Segunda Prova"],
      [AVAL_WEIGHT_X, "30"],
      [AVAL_DATE_X, "25/11/2026"],
      [AVAL_COVERAGE_X, "Unidades 3 e 4"],
    ],
  },

  // Quebra de página no meio da tabela: o PDF repete o cabeçalho e o SEI
  // injeta o próprio chrome.
  { page: 2, cells: [[AVAL_TITLE_X, SEI_HEADER]] },
  { ...AVALIACAO_HEADER },
  {
    cells: [
      [AVAL_TITLE_X, "Trabalho"],
      [AVAL_WEIGHT_X, "20"],
      [AVAL_DATE_X, "Será definido"],
      [AVAL_COVERAGE_X, "Todo o"],
    ],
  },
  {
    gap: SAME_CELL_GAP,
    cells: [
      [AVAL_DATE_X, "posteriormente"],
      [AVAL_COVERAGE_X, "conteúdo"],
    ],
  },
  {
    cells: [
      [AVAL_TITLE_X, "Exame Especial"],
      [AVAL_DATE_X, "15/12/2026"],
      [AVAL_COVERAGE_X, "Todo o conteúdo"],
    ],
  },

  textRow("Horário de Atendimento"),
  textRow("Quarta-feira, 14:00 - 16:00, sala 12"),

  textRow("Cronograma"),
  {
    cells: [
      [LESSON_NUM_X, "Aula"],
      [LESSON_KIND_X, "Tipo"],
      [LESSON_DATE_X, "Data"],
      [LESSON_CONTENT_X, "Conteúdo previsto"],
    ],
  },
  {
    cells: [
      [LESSON_NUM_X, "1"],
      [LESSON_KIND_X, "Teórica"],
      [LESSON_DATE_X, "26/08/2026"],
      [LESSON_CONTENT_X, "Apresentação da disciplina e do plano de ensino"],
    ],
  },
  // Conteúdo em 3 linhas visuais, marcador da aula na linha do meio.
  { cells: [[LESSON_CONTENT_X, "Medidas de tendência central: média,"]] },
  {
    gap: SAME_CELL_GAP,
    cells: [
      [LESSON_NUM_X, "5"],
      [LESSON_KIND_X, "Teórica"],
      [LESSON_DATE_X, "16/09/2026"],
      [LESSON_CONTENT_X, "mediana e moda, com exemplos"],
    ],
  },
  { gap: SAME_CELL_GAP, cells: [[LESSON_CONTENT_X, "resolvidos em sala"]] },
  {
    cells: [
      [LESSON_NUM_X, "12"],
      [LESSON_KIND_X, "-"],
      [LESSON_DATE_X, "02/11/2026"],
      [LESSON_CONTENT_X, "Feriado nacional"],
    ],
  },
  {
    cells: [
      [LESSON_NUM_X, "18"],
      [LESSON_KIND_X, "Prática"],
      [LESSON_DATE_X, "09/12/2026"],
      [LESSON_CONTENT_X, "Laboratório de análise de dados"],
    ],
  },
  textRow("Bibliografia"),
  textRow("MORETTIN, P. Estatística Básica. São Paulo, 2017."),
  textRow(SEI_FOOTER),
]);

/**
 * Formato aula-a-aula sem coluna de tipo e sem ano na data (a data vem seguida
 * da abreviação do dia da semana). Só é reconhecido quando o ano de início do
 * período letivo é passado como fallback.
 */
export const perAulaShortDate = buildPdfLines([
  textRow("Cronograma"),
  {
    cells: [
      [LESSON_NUM_X, "Aula"],
      [LESSON_DATE_X, "Data"],
      [LESSON_CONTENT_X, "Conteúdo"],
    ],
  },
  {
    cells: [
      [LESSON_NUM_X, "1"],
      [LESSON_DATE_X, "26/08 Qua"],
      [LESSON_CONTENT_X, "Estatística Descritiva I"],
    ],
  },
  {
    cells: [
      [LESSON_NUM_X, "2"],
      [LESSON_DATE_X, "28/08 Sex"],
      [LESSON_CONTENT_X, "Tabelas de frequência e"],
    ],
  },
  { gap: SAME_CELL_GAP, cells: [[LESSON_CONTENT_X, "histogramas"]] },
  textRow("Bibliografia"),
]);

// Posições x das colunas do cronograma semanal em tabela.
const WEEK_NUM_X = 60;
const WEEK_PERIOD_X = 130;
const WEEK_CONTENT_X = 230;

/**
 * Formato semanal em tabela ("Semana | Período | Descrição"). O caso difícil é
 * a semana 15: a célula de conteúdo lista 3 tópicos com o MESMO espaçamento
 * vertical (~15pt) que separa duas semanas — clustering por proximidade
 * sozinho perderia as duas últimas linhas.
 */
export const weeklyTable = buildPdfLines([
  textRow("Cronograma"),
  {
    cells: [
      [WEEK_NUM_X, "Semana"],
      [WEEK_PERIOD_X, "Período"],
      [WEEK_CONTENT_X, "Descrição"],
    ],
  },
  {
    cells: [
      [WEEK_NUM_X, "1"],
      [WEEK_PERIOD_X, "24-28/ago"],
      [WEEK_CONTENT_X, "Apresentação do curso"],
    ],
  },
  { gap: SAME_CELL_GAP, cells: [[WEEK_CONTENT_X, "e do plano de ensino"]] },
  {
    cells: [
      [WEEK_NUM_X, "2"],
      [WEEK_PERIOD_X, "31/ago-04/set"],
      [WEEK_CONTENT_X, "Revisão de conjuntos"],
    ],
  },
  {
    cells: [
      [WEEK_NUM_X, "15"],
      [WEEK_PERIOD_X, "01-05/dez"],
      [WEEK_CONTENT_X, "Revisão geral"],
    ],
  },
  { gap: NEW_ROW_GAP, cells: [[WEEK_CONTENT_X, "Resolução de exercícios"]] },
  { gap: NEW_ROW_GAP, cells: [[WEEK_CONTENT_X, "Reposição das aulas"]] },
  textRow("Bibliografia"),
]);

/**
 * Formato semanal em prosa, sem tabela: "Semana NN (período): conteúdo". A
 * linha de continuação menciona "Semana 15" no meio do texto — o parser só
 * pode abrir registro novo quando "Semana" está no INÍCIO da linha.
 */
export const weeklyProse = buildPdfLines([
  textRow("Cronograma"),
  textRow("Semana 01 (24-28/ago): Apresentação do curso e do plano de ensino."),
  textRow("Semana 02 (31/ago-04/set): Revisão de conjuntos e funções."),
  textRow("Semana 15 (01-05/dez): Revisão geral."),
  textRow("Reposição das aulas na Semana 15."),
  textRow("Bibliografia"),
]);

/**
 * Seção de avaliação em prosa (sem tabela "Descrição da avaliação"): itens com
 * marcador e o peso real só na fórmula da nota final. O "10,0 pontos" de cada
 * item é a nota máxima, não o peso.
 */
export const avaliacaoProse = buildPdfLines([
  textRow("Atividades avaliativas:"),
  textRow("• Prova 1 - 10,0 pontos (P1) - dia 29/09/2026"),
  textRow("• Prova 2 - 10,0 pontos (P2) - dia 10/11/2026"),
  textRow("• Trabalho Final - 10,0 pontos (TF) - ao longo do semestre"),
  textRow("• Exame Especial - 10,0 pontos - a definir"),
  textRow("Nota final = (P1x0,3) + (P2x0,3) + (E1x0,1) + (TFx0,3)"),
  textRow("Cronograma"),
  {
    cells: [
      [LESSON_NUM_X, "1"],
      [LESSON_KIND_X, "Teórica"],
      [LESSON_DATE_X, "26/08/2026"],
      [LESSON_CONTENT_X, "Apresentação"],
    ],
  },
  textRow("Bibliografia"),
]);

/**
 * Cabeçalho da tabela de avaliação quebrado em 3 linhas, com a célula de uma
 * coluna vindo ANTES da linha que ancora a busca ("Descrição da..."). Um
 * cluster que só olhasse pra frente perderia a linha de cima inteira.
 */
export const avaliacaoHeaderQuebrado = buildPdfLines([
  textRow("Ementa da disciplina."),
  {
    cells: [
      [AVAL_WEIGHT_X, "Peso da"],
      [AVAL_DATE_X, "Data"],
    ],
  },
  {
    gap: SAME_CELL_GAP,
    cells: [
      [AVAL_TITLE_X, "Descrição da avaliação"],
      [AVAL_COVERAGE_X, "Conteúdo avaliado"],
    ],
  },
  { gap: SAME_CELL_GAP, cells: [[AVAL_WEIGHT_X, "avaliação (%)"]] },
  {
    cells: [
      [AVAL_TITLE_X, "Primeira Prova"],
      [AVAL_WEIGHT_X, "40"],
      [AVAL_DATE_X, "07/10/2026"],
      [AVAL_COVERAGE_X, "Unidades 1 e 2"],
    ],
  },
  {
    cells: [
      [AVAL_TITLE_X, "Segunda Prova"],
      [AVAL_WEIGHT_X, "60"],
      [AVAL_DATE_X, "25/11/2026"],
      [AVAL_COVERAGE_X, "Unidades 3 e 4"],
    ],
  },
  textRow("Cronograma"),
  textRow("Bibliografia"),
]);
