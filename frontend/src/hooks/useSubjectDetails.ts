import { useCallback, useEffect, useState } from "react";
import { getSubjectDetails } from "../api/client";
import type { SubjectDetails } from "../api/types";

export function useSubjectDetails(id: number | null) {
  const [details, setDetails] = useState<SubjectDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Não mexe em `loading` aqui: só a montagem inicial (efeito abaixo) mostra o
  // skeleton de página inteira. Recarregar depois de uma mutação (salvar sala,
  // marcar falta, etc.) atualiza `details` no lugar sem re-montar a página —
  // senão cada ação nessa hub gera um flash de "recarregando tudo de novo".
  const load = useCallback(() => {
    if (id === null) return Promise.resolve();
    setError(null);
    return getSubjectDetails(id)
      .then(setDetails)
      .catch((err) => setError(err instanceof Error ? err.message : "Erro ao carregar matéria"))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  return { details, loading, error, reload: load };
}
