import { useCallback, useEffect, useRef, useState } from "react";
import { subjectsApi, getSubjectDetails } from "../api/client";
import { isOverdue } from "../lib/grades";
import type { SubjectDetails } from "../api/types";

export type UpcomingItem = {
  kind: "assignment" | "exam";
  id: number;
  subjectId: number;
  subjectName: string;
  title: string;
  date: string;
  grade: number | null;
};

export function useDashboardData(periodIds: number[]) {
  const [subjects, setSubjects] = useState<SubjectDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const periodIdsKey = periodIds.slice().sort((a, b) => a - b).join(",");

  // Mesma ideia do useSubjectDetails: um patchSubject() (ex: arrastar uma
  // prova pro dia seguinte no Calendário) invalida qualquer load() ainda em
  // voo, pra uma resposta atrasada não sobrescrever a edição mais recente.
  const generationRef = useRef(0);

  useEffect(() => {
    if (periodIdsKey === "") {
      setSubjects([]);
      setLoading(false);
      return;
    }

    const wantedPeriodIds = new Set(periodIdsKey.split(",").map(Number));
    const generation = ++generationRef.current;
    setLoading(true);
    setError(null);

    subjectsApi
      .list()
      .then(async (all) => {
        const periodSubjects = all.filter((s) => wantedPeriodIds.has(s.periodId));
        const details = await Promise.all(periodSubjects.map((s) => getSubjectDetails(s.id)));
        if (generationRef.current === generation) setSubjects(details);
      })
      .catch((err) => {
        if (generationRef.current === generation) {
          setError(err instanceof Error ? err.message : "Erro ao carregar dashboard");
        }
      })
      .finally(() => {
        if (generationRef.current === generation) setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodIdsKey, version]);

  // Deixa quem chama aplicar uma mudança pontual numa matéria (ex: mover a
  // data de uma prova arrastando no Calendário) sem refazer o N+1 inteiro.
  const patchSubject = useCallback((subjectId: number, updater: (prev: SubjectDetails) => SubjectDetails) => {
    generationRef.current++;
    // Um load() que essa geração deixou pra trás nunca mais vai poder chamar
    // seu próprio setLoading(false) (a resposta dele vai ser ignorada) —
    // então tira o loading aqui, senão a página fica presa no skeleton.
    setLoading(false);
    setSubjects((prev) => prev.map((s) => (s.id === subjectId ? updater(s) : s)));
  }, []);

  const upcoming: UpcomingItem[] = subjects
    .flatMap((subject) => [
      ...subject.assignments.map((a) => ({
        kind: "assignment" as const,
        id: a.id,
        subjectId: subject.id,
        subjectName: subject.name,
        title: a.title,
        date: a.dueDate,
        grade: a.grade,
      })),
      ...subject.exams.map((e) => ({
        kind: "exam" as const,
        id: e.id,
        subjectId: subject.id,
        subjectName: subject.name,
        title: e.title,
        date: e.date,
        grade: e.grade,
      })),
    ])
    // "Próximas" tem que ser o que ainda pede alguma ação: o que já passou e
    // já tem nota está encerrado e só empurrava o que de fato vem a seguir
    // pro fim de uma lista ordenada por data crescente. O que passou sem nota
    // continua aqui — é justamente o que aparece com o selo "atrasada".
    .filter((item) => item.grade === null || !isOverdue(item.date))
    .sort((a, b) => a.date.localeCompare(b.date));

  return { subjects, upcoming, loading, error, refresh: () => setVersion((v) => v + 1), patchSubject };
}
