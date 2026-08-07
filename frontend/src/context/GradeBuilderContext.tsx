import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

const STORAGE_KEY = "notary:gradeBuilder";

type GradeBuilderContextValue = {
  selectedIds: Set<number>;
  toggle: (id: number) => void;
  isSelected: (id: number) => boolean;
  clear: () => void;
};

const GradeBuilderContext = createContext<GradeBuilderContextValue | null>(null);

function readStoredIds(): Set<number> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return new Set();
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? new Set(parsed) : new Set();
  } catch {
    return new Set();
  }
}

export function GradeBuilderProvider({ children }: { children: ReactNode }) {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(readStoredIds);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...selectedIds]));
  }, [selectedIds]);

  const toggle = (id: number) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const clear = () => setSelectedIds(new Set());
  const isSelected = (id: number) => selectedIds.has(id);

  return (
    <GradeBuilderContext.Provider value={{ selectedIds, toggle, isSelected, clear }}>
      {children}
    </GradeBuilderContext.Provider>
  );
}

export function useGradeBuilder() {
  const ctx = useContext(GradeBuilderContext);
  if (!ctx) {
    throw new Error("useGradeBuilder precisa estar dentro de um GradeBuilderProvider");
  }
  return ctx;
}
