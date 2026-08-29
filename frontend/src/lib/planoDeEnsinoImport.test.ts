import { describe, expect, it } from "vitest";
import { parsePlanoDeEnsinoLines } from "./planoDeEnsinoImport";
import {
  avaliacaoHeaderQuebrado,
  avaliacaoProse,
  perAulaFullDate,
  perAulaShortDate,
  weeklyProse,
  weeklyTable,
} from "./__fixtures__/planoDeEnsino";

const PERIOD_START_YEAR = 2026;

describe("cronograma aula-a-aula (data completa)", () => {
  const result = parsePlanoDeEnsinoLines(perAulaFullDate, PERIOD_START_YEAR);

  it("detecta o formato per_aula", () => {
    expect(result.format).toBe("per_aula");
  });

  it("lê uma aula por linha da tabela, ignorando o cabeçalho", () => {
    expect(result.entries.map((e) => e.lessonNumber)).toEqual([1, 5, 12, 18]);
  });

  it("normaliza o tipo da aula, com null pro feriado sem tipo", () => {
    expect(result.entries.map((e) => e.kind)).toEqual(["T", "T", null, "P"]);
  });

  it("converte a data pra YYYY-MM-DD", () => {
    expect(result.entries.map((e) => e.date)).toEqual([
      "2026-08-26",
      "2026-09-16",
      "2026-11-02",
      "2026-12-09",
    ]);
  });

  // O caso que motivou o agrupamento por proximidade vertical: a célula
  // "Aula/Data" fica centralizada, então a linha com o número da aula é a do
  // MEIO do bloco — juntar "tudo depois do marcador" perderia a primeira linha.
  it("junta as 3 linhas visuais de uma aula cujo conteúdo quebra, mesmo com o marcador no meio", () => {
    expect(result.entries[1].content).toBe(
      "Medidas de tendência central: média, mediana e moda, com exemplos resolvidos em sala",
    );
  });

  it("não trata o conteúdo programático nem a bibliografia como aula", () => {
    expect(result.entries).toHaveLength(4);
  });
});

describe("conteúdo programático", () => {
  const { topics } = parsePlanoDeEnsinoLines(perAulaFullDate, PERIOD_START_YEAR);

  it("extrai os tópicos hierárquicos entre o heading e Objetivos", () => {
    expect(topics).toEqual([
      { code: "1", title: "Estatística Descritiva", position: 0 },
      { code: "1.1", title: "Tabelas de frequência", position: 1 },
      { code: "1.2", title: "Medidas de posição", position: 2 },
      { code: "2", title: "Probabilidade", position: 3 },
    ]);
  });
});

describe("tabela de avaliação", () => {
  const { assessments } = parsePlanoDeEnsinoLines(perAulaFullDate, PERIOD_START_YEAR);

  it("lê uma avaliação por linha da tabela", () => {
    expect(assessments.map((a) => a.title)).toEqual([
      "Primeira Prova",
      "Segunda Prova",
      "Trabalho",
      "Exame Especial",
    ]);
  });

  it("mantém peso, data e cobertura na coluna certa", () => {
    expect(assessments[0]).toEqual({
      title: "Primeira Prova",
      weightLabel: "30",
      dateLabel: "07/10/2026",
      coverageLabel: "Unidades 1 e 2",
      position: 0,
    });
  });

  it("junta a célula que quebra em duas linhas sem misturar colunas", () => {
    expect(assessments[2].dateLabel).toBe("Será definido posteriormente");
    expect(assessments[2].coverageLabel).toBe("Todo o conteúdo");
  });

  it("deixa weightLabel null quando a coluna de peso vem vazia", () => {
    expect(assessments[3].weightLabel).toBeNull();
  });

  // Chrome do SEI e cabeçalho repetido na quebra de página viravam avaliações
  // espúrias, porque o binning por coluna não checa se a linha é dado de verdade.
  it("descarta o cabeçalho repetido na quebra de página e o chrome do SEI", () => {
    expect(assessments).toHaveLength(4);
    expect(assessments.some((a) => a.title.includes("SEI/"))).toBe(false);
    expect(assessments.some((a) => a.title.startsWith("Descrição da"))).toBe(false);
  });

  // Sem parar em "Horário de Atendimento", essas linhas entravam na tabela.
  it("para a tabela na seção de Horário de Atendimento", () => {
    expect(assessments.some((a) => a.title.startsWith("Quarta-feira"))).toBe(false);
  });

  it("lê a tabela mesmo com o cabeçalho quebrado em 3 linhas", () => {
    const { assessments: quebrado } = parsePlanoDeEnsinoLines(avaliacaoHeaderQuebrado, PERIOD_START_YEAR);
    expect(quebrado).toEqual([
      {
        title: "Primeira Prova",
        weightLabel: "40",
        dateLabel: "07/10/2026",
        coverageLabel: "Unidades 1 e 2",
        position: 0,
      },
      {
        title: "Segunda Prova",
        weightLabel: "60",
        dateLabel: "25/11/2026",
        coverageLabel: "Unidades 3 e 4",
        position: 1,
      },
    ]);
  });
});

describe("cronograma aula-a-aula (data sem ano)", () => {
  it("usa o ano de início do período letivo como fallback", () => {
    const result = parsePlanoDeEnsinoLines(perAulaShortDate, PERIOD_START_YEAR);
    expect(result.format).toBe("per_aula");
    expect(result.entries).toEqual([
      {
        lessonNumber: 1,
        kind: null,
        date: "2026-08-26",
        weekNumber: null,
        periodLabel: null,
        content: "Estatística Descritiva I",
      },
      {
        lessonNumber: 2,
        kind: null,
        date: "2026-08-28",
        weekNumber: null,
        periodLabel: null,
        content: "Tabelas de frequência e histogramas",
      },
    ]);
  });

  // Sem ano no PDF e sem fallback não dá pra montar a data — melhor não
  // importar nada do que importar com o ano errado.
  it("não reconhece nada sem o ano de fallback", () => {
    expect(parsePlanoDeEnsinoLines(perAulaShortDate, null).entries).toEqual([]);
  });
});

describe("cronograma semanal em tabela", () => {
  const result = parsePlanoDeEnsinoLines(weeklyTable, PERIOD_START_YEAR);

  it("detecta o formato weekly", () => {
    expect(result.format).toBe("weekly");
    expect(result.entries.map((e) => e.weekNumber)).toEqual([1, 2, 15]);
    expect(result.entries.every((e) => e.date === null && e.lessonNumber === null)).toBe(true);
  });

  it("mantém o período como texto cru", () => {
    expect(result.entries.map((e) => e.periodLabel)).toEqual(["24-28/ago", "31/ago-04/set", "01-05/dez"]);
  });

  it("anexa a linha de continuação à semana certa", () => {
    expect(result.entries[0].content).toBe("Apresentação do curso e do plano de ensino");
  });

  // A semana 15 lista 3 tópicos com o mesmo gap vertical (~15pt) que separa
  // duas semanas — clustering por proximidade sozinho perderia as 2 últimas.
  it("não perde as linhas de uma célula que usa o mesmo gap de uma nova semana", () => {
    expect(result.entries[2].content).toBe("Revisão geral Resolução de exercícios Reposição das aulas");
  });
});

describe("cronograma semanal em prosa", () => {
  const result = parsePlanoDeEnsinoLines(weeklyProse, PERIOD_START_YEAR);

  it("abre um registro por linha 'Semana NN (...)'", () => {
    expect(result.format).toBe("weekly");
    expect(result.entries.map((e) => e.weekNumber)).toEqual([1, 2, 15]);
    expect(result.entries[0].periodLabel).toBe("24-28/ago");
  });

  // "Semana 15" no meio da frase não pode abrir um registro novo — só no início da linha.
  it("anexa a continuação que menciona 'Semana' no meio do texto", () => {
    expect(result.entries[2].content).toBe("Revisão geral. Reposição das aulas na Semana 15.");
  });
});

describe("avaliação em prosa (sem tabela)", () => {
  const { assessments } = parsePlanoDeEnsinoLines(avaliacaoProse, PERIOD_START_YEAR);

  it("lê um item por marcador", () => {
    expect(assessments.map((a) => a.title)).toEqual([
      "Prova 1",
      "Prova 2",
      "Trabalho Final",
      "Exame Especial",
    ]);
  });

  // "10,0 pontos" é a nota máxima do item, não o peso: o peso real só existe
  // na fórmula da nota final, casado pela sigla entre parênteses.
  it("tira o peso da fórmula da nota final, não do 'N pontos' do item", () => {
    expect(assessments.map((a) => a.weightLabel)).toEqual(["30%", "30%", "30%", null]);
  });

  it("guarda o resto da linha como dateLabel bruto", () => {
    expect(assessments[0].dateLabel).toBe("10,0 pontos (P1) - dia 29/09/2026");
    expect(assessments[3].dateLabel).toBe("10,0 pontos - a definir");
  });

  it("não trata a fórmula da nota final como uma avaliação", () => {
    expect(assessments.some((a) => a.title.toLowerCase().startsWith("nota final"))).toBe(false);
  });
});
