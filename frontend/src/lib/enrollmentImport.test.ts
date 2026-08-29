import { describe, expect, it } from "vitest";
import { parseEnrollmentLines } from "./enrollmentImport";

// Linhas fictícias com a estrutura do atestado de matrícula real.
const LINES = [
  "ATESTADO DE MATRÍCULA",
  "Aluno: FULANO DE TAL",
  "Disciplina Turma Nome Idioma",
  "CEA050 1 ESTATISTICA I PORTUGUES",
  "MTM101 12 CALCULO DIFERENCIAL E INTEGRAL II PORTUGUES",
  "CEA060 2 PROBABILIDADE",
  "CEA050 1 ESTATISTICA I PORTUGUES",
  "Total de créditos: 18",
];

describe("parseEnrollmentLines", () => {
  const entries = parseEnrollmentLines(LINES);

  it("lê código, turma e nome de cada matéria matriculada", () => {
    expect(entries).toEqual([
      { code: "CEA050", turma: "1", rawLabel: "ESTATISTICA I" },
      { code: "MTM101", turma: "12", rawLabel: "CALCULO DIFERENCIAL E INTEGRAL II" },
      { code: "CEA060", turma: "2", rawLabel: "PROBABILIDADE" },
    ]);
  });

  // A mesma matéria aparece repetida quando o atestado tem mais de uma página.
  it("não repete a mesma matéria+turma", () => {
    expect(entries.filter((e) => e.code === "CEA050")).toHaveLength(1);
  });

  it("tira o idioma do fim do nome da matéria", () => {
    expect(entries.every((e) => !e.rawLabel.includes("PORTUGUES"))).toBe(true);
  });

  it("ignora cabeçalho e rodapé", () => {
    expect(entries.some((e) => e.rawLabel.includes("FULANO"))).toBe(false);
    expect(entries).toHaveLength(3);
  });
});
