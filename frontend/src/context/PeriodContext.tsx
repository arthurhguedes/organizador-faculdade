import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { periodsApi } from "../api/client";
import type { Period } from "../api/types";

const STORAGE_KEY = "notary:selectedPeriodId";

type PeriodContextValue = {
  periods: Period[];
  loading: boolean;
  error: string | null;
  selectedPeriodId: number | null;
  selectedPeriod: Period | null;
  setSelectedPeriodId: (id: number | null) => void;
  refresh: () => void;
};

const PeriodContext = createContext<PeriodContextValue | null>(null);

export function PeriodProvider({ children }: { children: ReactNode }) {
  const [periods, setPeriods] = useState<Period[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriodId, setSelectedPeriodIdState] = useState<number | null>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? Number(stored) : null;
  });
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    periodsApi
      .list()
      .then((data) => {
        if (cancelled) return;
        setPeriods(data);
        setSelectedPeriodIdState((current) => {
          if (current !== null && data.some((p) => p.id === current)) {
            return current;
          }
          return data[0]?.id ?? null;
        });
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Erro ao carregar períodos");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [version]);

  const setSelectedPeriodId = (id: number | null) => {
    setSelectedPeriodIdState(id);
    if (id === null) {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, String(id));
    }
  };

  const selectedPeriod = useMemo(
    () => periods.find((p) => p.id === selectedPeriodId) ?? null,
    [periods, selectedPeriodId],
  );

  const value: PeriodContextValue = {
    periods,
    loading,
    error,
    selectedPeriodId,
    selectedPeriod,
    setSelectedPeriodId,
    refresh: () => setVersion((v) => v + 1),
  };

  return <PeriodContext.Provider value={value}>{children}</PeriodContext.Provider>;
}

export function usePeriods() {
  const ctx = useContext(PeriodContext);
  if (!ctx) {
    throw new Error("usePeriods precisa estar dentro de um PeriodProvider");
  }
  return ctx;
}
