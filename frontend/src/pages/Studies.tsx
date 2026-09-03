import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { StickyNote, Timer } from "lucide-react";
import { usePageTitle } from "../context/PageTitleContext";
import { PageHeader } from "../components/ui/PageHeader";
import { Tabs } from "../components/ui/Tabs";
import { StudiesTab } from "./studies/StudiesTab";
import { NotesTab } from "./studies/NotesTab";

type Tab = "estudos" | "anotacoes";

const TABS: Array<{ key: Tab; label: string; icon: typeof Timer }> = [
  { key: "estudos", label: "Estudos", icon: Timer },
  { key: "anotacoes", label: "Anotações", icon: StickyNote },
];

export function Studies() {
  usePageTitle("Estudos");
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") === "anotacoes" ? "anotacoes" : "estudos";
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);

  const goToTab = (tab: Tab) => {
    setActiveTab(tab);
    setSearchParams(tab === "estudos" ? {} : { tab }, { replace: true });
  };

  return (
    <div>
      <PageHeader title="Estudos" description="Pomodoro, horas de estudo por matéria e anotações do dia." />

      <Tabs tabs={TABS} active={activeTab} onChange={goToTab} ariaLabel="Seções de estudos e anotações" />

      {activeTab === "estudos" ? <StudiesTab /> : <NotesTab />}
    </div>
  );
}
