import { describe, expect, it } from "vitest";
import { parseHistoricoLines } from "./historicoImport";

// Linhas fictícias com a MESMA estrutura do histórico real (que tem nome,
// matrícula e notas do usuário e não pode entrar num repositório público).
const LINES = [
  "UNIVERSIDADE FEDERAL DE EXEMPLO",
  "HISTÓRICO ESCOLAR",
  "Aluno: FULANO DE TAL Matrícula: 00.0.0000",
  "Ano/Sem Disciplina CH Média Freq Situação",
  "2025/1 CEA050 - ESTATISTICA I 60/60 8.5 60/60 AP",
  "2025/1 CEA050 ANA PEREIRA LIMA (T)",
  "2025/1 MTM101 - CALCULO DIFERENCIAL E INTEGRAL II 90/90 4.5 90/90 RN",
  "2025/1 MTM101 CARLOS SOUZA",
  "2025/2 CEA060 - PROBABILIDADE 60/60 7.0 60/60 AP",
  "2025/2 CEA060 ANA PEREIRA LIMA (T+P)",
  "Coeficiente de rendimento acumulado: 6.67",
];

describe("parseHistoricoLines", () => {
  const { entries, professors } = parseHistoricoLines(LINES);

  it("lê uma matéria por linha de disciplina", () => {
    expect(entries).toHaveLength(3);
    expect(entries[0]).toEqual({
      anoSem: "2025/1",
      code: "CEA050",
      disciplina: "ESTATISTICA I",
      workloadHours: 60,
      media: 8.5,
      situacao: "AP",
    });
  });

  it("preserva nome de disciplina com várias palavras", () => {
    expect(entries[1].disciplina).toBe("CALCULO DIFERENCIAL E INTEGRAL II");
    expect(entries[1].workloadHours).toBe(90);
  });

  it("mantém a situação de reprovação", () => {
    expect(entries.map((e) => e.situacao)).toEqual(["AP", "RN", "AP"]);
  });

  it("associa o professor ao período e ao código da matéria", () => {
    expect(professors).toEqual([
      { anoSem: "2025/1", code: "CEA050", professorName: "ANA PEREIRA LIMA" },
      { anoSem: "2025/1", code: "MTM101", professorName: "CARLOS SOUZA" },
      { anoSem: "2025/2", code: "CEA060", professorName: "ANA PEREIRA LIMA" },
    ]);
  });

  // O sufixo de tipo de aula vem colado no nome na linha do professor.
  it("tira o sufixo de tipo de aula do nome do professor", () => {
    expect(professors.every((p) => !p.professorName.includes("("))).toBe(true);
  });

  it("ignora cabeçalho, dados do aluno e rodapé", () => {
    expect(entries.some((e) => e.disciplina.includes("FULANO"))).toBe(false);
    expect(professors.some((p) => p.professorName.includes("Coeficiente"))).toBe(false);
  });

  it("não confunde linha de disciplina com linha de professor", () => {
    expect(professors.some((p) => p.professorName.startsWith("-"))).toBe(false);
    expect(professors).toHaveLength(3);
  });
});
