import { useCallback, useEffect, useRef, useState } from "react";
import { getSubjectDetails } from "../api/client";
import type { SubjectDetails } from "../api/types";

export function useSubjectDetails(id: number | null) {
  const [details, setDetails] = useState<SubjectDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cada load()/patch() sobe essa "geração". Uma resposta de load() só é
  // aplicada se nada mexeu no estado (outro load ou um patch local) desde
  // que ela foi disparada — sem isso, uma resposta atrasada (o StrictMode do
  // React dispara o efeito de montagem 2x em dev, e mesmo em prod duas
  // requisições podem resolver fora de ordem) podia sobrescrever uma edição
  // mais nova já aplicada localmente, fazendo a nota/horário "voltar sozinho".
  const generationRef = useRef(0);

  // Não mexe em `loading` aqui: só a montagem inicial (efeito abaixo) mostra o
  // skeleton de página inteira. Recarregar depois de uma mutação (salvar sala,
  // marcar falta, etc.) atualiza `details` no lugar sem re-montar a página —
  // senão cada ação nessa hub gera um flash de "recarregando tudo de novo".
  const load = useCallback(() => {
    if (id === null) return Promise.resolve();
    const generation = ++generationRef.current;
    setError(null);
    return getSubjectDetails(id)
      .then((data) => {
        if (generationRef.current === generation) setDetails(data);
      })
      .catch((err) => {
        if (generationRef.current === generation) {
          setError(err instanceof Error ? err.message : "Erro ao carregar matéria");
        }
      })
      .finally(() => {
        if (generationRef.current === generation) setLoading(false);
      });
  }, [id]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  // Deixa quem chama aplicar uma mudança pontual (ex: uma nota, um item de
  // lista) sem refazer o GET agregado inteiro — mesma ideia do useEntityList.
  // Também invalida qualquer load() ainda em voo, pra ele não sobrescrever
  // esse patch quando responder depois.
  const patch = useCallback((updater: (prev: SubjectDetails) => SubjectDetails) => {
    generationRef.current++;
    // Um load() que essa geração deixou pra trás nunca mais vai poder chamar
    // seu próprio setLoading(false) (a resposta dele vai ser ignorada) —
    // então tira o loading aqui, senão a página fica presa no skeleton.
    setLoading(false);
    setDetails((prev) => (prev ? updater(prev) : prev));
  }, []);

  return { details, loading, error, reload: load, patch };
}
