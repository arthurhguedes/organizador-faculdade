import { useCallback, useEffect, useState } from "react";
import { getSubjectDetails } from "../api/client";
import type { SubjectDetails } from "../api/types";

export function useSubjectDetails(id: number | null) {
  const [details, setDetails] = useState<SubjectDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (id === null) return;
    setLoading(true);
    setError(null);
    getSubjectDetails(id)
      .then(setDetails)
      .catch((err) => setError(err instanceof Error ? err.message : "Erro ao carregar matéria"))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  return { details, loading, error, reload: load };
}
