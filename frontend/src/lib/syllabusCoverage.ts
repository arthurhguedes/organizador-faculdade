import type { SyllabusAssessment, SyllabusEntryWeekly, SyllabusTopic } from "../api/types";

function parseWeekRange(label: string | null): [number, number] | null {
  if (!label) return null;
  const match = /semanas?\s+(\d+)\s*(?:[-–—]\s*(\d+))?/i.exec(label);
  if (!match) return null;
  const start = Number(match[1]);
  return [start, match[2] ? Number(match[2]) : start];
}

// Resolve quais tópicos uma avaliação cobre cruzando o intervalo de semanas
// do "Conteúdo avaliado" (ex: "Semanas 1 – 5") com o conteúdo das entradas de
// cronograma semanal daquele intervalo, casando os códigos de tópico que
// aparecem nesse conteúdo. O lookaround `(?<![\d.])CODE(?!\.?\d)` garante que
// "1" não dê match dentro de "1.1" (rejeitado pelo lookahead: depois do "1"
// em "1.1" vem ".1", que bate em `\.?\d`) mas ainda case "1" quando seguido
// só do ponto de fim de frase do título do capítulo (ex: "1. Sistema...",
// onde depois do "1" vem ". " — não bate em `\.?\d` porque não há dígito
// depois do ponto).
export function resolveAssessmentTopics(
  assessment: SyllabusAssessment,
  weeklyEntries: SyllabusEntryWeekly[],
  topics: SyllabusTopic[],
): SyllabusTopic[] {
  const range = parseWeekRange(assessment.coverageLabel);
  if (!range) return [];
  const [start, end] = range;

  const content = weeklyEntries
    .filter((entry) => entry.weekNumber >= start && entry.weekNumber <= end)
    .map((entry) => entry.content)
    .join(" ");
  if (!content) return [];

  return topics
    .filter((topic) => {
      const escaped = topic.code.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      return new RegExp(`(?<![\\d.])${escaped}(?!\\.?\\d)`).test(content);
    })
    .sort((a, b) => a.position - b.position);
}
