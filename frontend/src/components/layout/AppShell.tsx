import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { Footer } from "./Footer";
import { useCurrentPageTitle } from "../../context/PageTitleContext";
import { usePeriods } from "../../context/PeriodContext";
import { ErrorBanner } from "../ui/ErrorBanner";

export function AppShell() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const title = useCurrentPageTitle();
  const { error: periodsError } = usePeriods();

  return (
    <div className="app-shell">
      <div className={`sidebar-wrap${mobileNavOpen ? " sidebar-wrap--open" : ""}`}>
        <Sidebar onNavigate={() => setMobileNavOpen(false)} />
      </div>
      {mobileNavOpen && (
        <button
          type="button"
          className="sidebar-scrim"
          aria-label="Fechar menu"
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      <div className="app-shell__main">
        <TopBar title={title} onMenuClick={() => setMobileNavOpen((v) => !v)} />
        <main className="app-shell__content">
          {periodsError && <ErrorBanner message={`Erro ao carregar períodos: ${periodsError}`} />}
          <Outlet />
        </main>
        <Footer />
      </div>
    </div>
  );
}
