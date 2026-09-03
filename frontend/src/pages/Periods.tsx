import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { BookOpen, CalendarRange } from "lucide-react";
import { usePageTitle } from "../context/PageTitleContext";
import { PageHeader } from "../components/ui/PageHeader";
import { Tabs } from "../components/ui/Tabs";
import { PeriodsTab } from "./periods/PeriodsTab";
import { SubjectsTab } from "./periods/SubjectsTab";

type Tab = "periodos" | "materias";

const TABS: Array<{ key: Tab; label: string; icon: typeof CalendarRange }> = [
  { key: "periodos", label: "Períodos", icon: CalendarRange },
  { key: "materias", label: "Matérias", icon: BookOpen },
];

export function Periods() {
  usePageTitle("Períodos");
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") === "materias" ? "materias" : "periodos";
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);

  const goToTab = (tab: Tab) => {
    setActiveTab(tab);
    setSearchParams(tab === "periodos" ? {} : { tab }, { replace: true });
  };

  return (
    <div>
      <PageHeader title="Períodos" />

      <Tabs tabs={TABS} active={activeTab} onChange={goToTab} ariaLabel="Seções de períodos e matérias" />

      {activeTab === "periodos" ? <PeriodsTab /> : <SubjectsTab />}
    </div>
  );
}
