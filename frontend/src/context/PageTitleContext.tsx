import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

const PageTitleContext = createContext<{ title: string; setTitle: (title: string) => void } | null>(null);

export function PageTitleProvider({ children }: { children: ReactNode }) {
  const [title, setTitle] = useState("Dashboard");
  return <PageTitleContext.Provider value={{ title, setTitle }}>{children}</PageTitleContext.Provider>;
}

export function usePageTitle(title: string) {
  const ctx = useContext(PageTitleContext);
  if (!ctx) {
    throw new Error("usePageTitle precisa estar dentro de um PageTitleProvider");
  }
  useEffect(() => {
    ctx.setTitle(title);
  }, [title]);
}

export function useCurrentPageTitle() {
  const ctx = useContext(PageTitleContext);
  if (!ctx) {
    throw new Error("useCurrentPageTitle precisa estar dentro de um PageTitleProvider");
  }
  return ctx.title;
}
