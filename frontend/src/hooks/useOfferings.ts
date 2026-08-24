import { useCallback, useEffect, useState } from "react";
import { offeringsApi, ApiError } from "../api/client";
import type { Offering } from "../api/types";
import type { ParsedOffering } from "../lib/offeringsImport";
import { useToast } from "../context/ToastContext";

export function useOfferings() {
  const [offerings, setOfferings] = useState<Offering[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const { notify } = useToast();

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    offeringsApi
      .list()
      .then(setOfferings)
      .catch((err) => setError(err instanceof Error ? err.message : "Erro ao carregar ofertas"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const importOfferings = async (parsed: ParsedOffering[]) => {
    setImporting(true);
    try {
      const result = await offeringsApi.import(parsed);
      notify(result.message, "success");
      load();
      return true;
    } catch (err) {
      notify(err instanceof ApiError ? err.message : "Erro ao importar planilha", "error");
      return false;
    } finally {
      setImporting(false);
    }
  };

  const clearOfferings = async () => {
    try {
      const result = await offeringsApi.clear();
      notify(result.message, "success");
      load();
      return true;
    } catch (err) {
      notify(err instanceof ApiError ? err.message : "Erro ao remover ofertas", "error");
      return false;
    }
  };

  return { offerings, loading, error, importing, importOfferings, clearOfferings, reload: load };
}
