import { describe, expect, it } from "vitest";
import {
  applyInstitutionMapping,
  parseOfferingsRows,
  suggestOfferingsMapping,
  type ColumnMapping,
} from "./offeringsImport";

// Cabeçalhos no formato da planilha de oferta usada como referência — o
// mapeamento automático precisa cobrir esse caso sem exigir nenhum clique.
const HEADERS = [
  "Código",
  "Disciplina",
  "Professor(a)",
  "Turma",
  "Curso",
  "Vagas",
  "Depto",
  "CH",
  "T",
  "P",
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
];

describe("suggestOfferingsMapping", () => {
  it("mapeia a planilha de referência inteira por correspondência exata", () => {
    expect(suggestOfferingsMapping(HEADERS)).toEqual({
      subjectCode: "Código",
      subjectName: "Disciplina",
      professorName: "Professor(a)",
      turma: "Turma",
      curso: "Curso",
      vagas: "Vagas",
      depto: "Depto",
      workloadHours: "CH",
      theoryHours: "T",
      practiceHours: "P",
      segunda: "Segunda",
      terça: "Terça",
      quarta: "Quarta",
      quinta: "Quinta",
      sexta: "Sexta",
      sábado: "Sábado",
    });
  });

  it("ignora acento, caixa e pontuação do cabeçalho", () => {
    const mapping = suggestOfferingsMapping(["CODIGO", "disciplina", "CARGA HORARIA"]);
    expect(mapping.subjectCode).toBe("CODIGO");
    expect(mapping.subjectName).toBe("disciplina");
    expect(mapping.workloadHours).toBe("CARGA HORARIA");
  });

  it("cai pra correspondência parcial quando o cabeçalho tem texto extra", () => {
    const mapping = suggestOfferingsMapping(["Cod. Disciplina", "Nome da Disciplina", "Nome do Professor"]);
    expect(mapping.subjectCode).toBe("Cod. Disciplina");
    expect(mapping.subjectName).toBe("Nome da Disciplina");
    expect(mapping.professorName).toBe("Nome do Professor");
  });

  it("nunca usa a mesma coluna pra dois campos", () => {
    const mapping = suggestOfferingsMapping(HEADERS);
    const used = Object.values(mapping);
    expect(new Set(used).size).toBe(used.length);
  });

  it("deixa em branco o campo sem coluna correspondente", () => {
    expect(suggestOfferingsMapping(["Código", "Disciplina"]).professorName).toBeUndefined();
  });
});

const FULL_MAPPING = suggestOfferingsMapping(HEADERS);

function row(values: Partial<Record<string, unknown>>): Record<string, unknown> {
  const base: Record<string, unknown> = {};
  for (const header of HEADERS) base[header] = null;
  return { ...base, ...values };
}

describe("parseOfferingsRows", () => {
  it("exige código e nome — linha sem um dos dois é ignorada", () => {
    const rows = [
      row({ Código: "CEA050", Disciplina: "Estatística I" }),
      row({ Código: "MTM101" }),
      row({ Disciplina: "Cálculo II" }),
      row({}),
    ];
    expect(parseOfferingsRows(rows, FULL_MAPPING)).toHaveLength(1);
  });

  it("devolve vazio sem as colunas obrigatórias mapeadas", () => {
    expect(parseOfferingsRows([row({ Código: "CEA050", Disciplina: "Estatística I" })], {})).toEqual([]);
  });

  it("lê os campos numéricos, aceitando vírgula decimal", () => {
    const [offering] = parseOfferingsRows(
      [row({ Código: "CEA050", Disciplina: "Estatística I", Vagas: "40", CH: "60", T: "45,5", P: 15 })],
      FULL_MAPPING,
    );
    expect(offering.vagas).toBe(40);
    expect(offering.workloadHours).toBe(60);
    expect(offering.theoryHours).toBe(45.5);
    expect(offering.practiceHours).toBe(15);
  });

  it("trata célula vazia e o texto 'null' como ausente", () => {
    const [offering] = parseOfferingsRows(
      [row({ Código: "CEA050", Disciplina: "Estatística I", Curso: "  ", Depto: "null" })],
      FULL_MAPPING,
    );
    expect(offering.curso).toBeNull();
    expect(offering.depto).toBeNull();
  });

  // Na planilha de referência o professor vem com o tipo de aula colado no
  // nome, ex: "Ana Pereira (T)" — isso não faz parte do nome.
  it("tira o sufixo de tipo de aula do nome do professor", () => {
    const [offering] = parseOfferingsRows(
      [row({ Código: "CEA050", Disciplina: "Estatística I", "Professor(a)": "Ana Pereira (T+P)" })],
      FULL_MAPPING,
    );
    expect(offering.professorName).toBe("Ana Pereira");
  });

  it("deixa o professor null quando a célula só tem o sufixo", () => {
    const [offering] = parseOfferingsRows(
      [row({ Código: "CEA050", Disciplina: "Estatística I", "Professor(a)": "(T)" })],
      FULL_MAPPING,
    );
    expect(offering.professorName).toBeNull();
  });

  // O xlsx devolve turma numérica como number — "1.0" não pode virar a turma.
  it("normaliza turma vinda como número da planilha", () => {
    const [offering] = parseOfferingsRows(
      [row({ Código: "CEA050", Disciplina: "Estatística I", Turma: "1.0" })],
      FULL_MAPPING,
    );
    expect(offering.turma).toBe("1");
  });

  // O backend exige turma não vazia; planilhas sem essa coluna precisam de um
  // valor sequencial por disciplina.
  it("gera turma sequencial por disciplina quando a planilha não tem a coluna", () => {
    const mapping: ColumnMapping = { ...FULL_MAPPING, turma: undefined };
    const rows = [
      row({ Código: "CEA050", Disciplina: "Estatística I" }),
      row({ Código: "CEA050", Disciplina: "Estatística I" }),
      row({ Código: "MTM101", Disciplina: "Cálculo II" }),
      row({ Código: "CEA050", Disciplina: "Estatística I" }),
    ];
    expect(parseOfferingsRows(rows, mapping).map((o) => `${o.subjectCode}-${o.turma}`)).toEqual([
      "CEA050-01",
      "CEA050-02",
      "MTM101-01",
      "CEA050-03",
    ]);
  });
});

describe("célula de horário", () => {
  function schedules(cell: unknown, weekdayColumn = "Segunda") {
    const [offering] = parseOfferingsRows(
      [row({ Código: "CEA050", Disciplina: "Estatística I", [weekdayColumn]: cell })],
      FULL_MAPPING,
    );
    return offering.schedules;
  }

  it("aceita HH:MM com hífen e assume tipo teórico quando o tipo é omitido", () => {
    expect(schedules("07:30-09:10")).toEqual([
      { weekday: "segunda", startTime: "07:30", endTime: "09:10", kind: "T" },
    ]);
  });

  it("aceita travessão, hora sem zero à esquerda e tipo prático", () => {
    expect(schedules("7:30 – 9:10 P")).toEqual([
      { weekday: "segunda", startTime: "07:30", endTime: "09:10", kind: "P" },
    ]);
  });

  it("aceita HH:MM:SS, descartando os segundos", () => {
    expect(schedules("13:00:00 - 14:40:00 T")).toEqual([
      { weekday: "segunda", startTime: "13:00", endTime: "14:40", kind: "T" },
    ]);
  });

  it("lê mais de um horário na mesma célula", () => {
    expect(schedules("07:30-09:10 T 09:20-11:00 P")).toEqual([
      { weekday: "segunda", startTime: "07:30", endTime: "09:10", kind: "T" },
      { weekday: "segunda", startTime: "09:20", endTime: "11:00", kind: "P" },
    ]);
  });

  it("ignora célula vazia e célula sem horário reconhecível", () => {
    expect(schedules(null)).toEqual([]);
    expect(schedules("a definir")).toEqual([]);
  });

  it("usa o dia da semana da coluna", () => {
    expect(schedules("07:30-09:10", "Sábado")[0].weekday).toBe("sábado");
  });
});

describe("applyInstitutionMapping", () => {
  const remembered: ColumnMapping = {
    subjectCode: "Código",
    subjectName: "Disciplina",
    professorName: "Professor(a)",
    vagas: "Vagas",
  };

  // A faculdade pode mudar as colunas entre semestres: o que foi lembrado só
  // vale pros campos cuja coluna ainda existe na planilha atual.
  it("mantém só os campos cuja coluna existe na planilha atual", () => {
    expect(applyInstitutionMapping(["Código", "Disciplina", "Turma"], remembered)).toEqual({
      subjectCode: "Código",
      subjectName: "Disciplina",
    });
  });

  it("devolve vazio quando nenhuma coluna lembrada existe mais", () => {
    expect(applyInstitutionMapping(["Cod", "Nome"], remembered)).toEqual({});
  });
});
