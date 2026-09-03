import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Building2, Users } from "lucide-react";
import { usePageTitle } from "../context/PageTitleContext";
import { PageHeader } from "../components/ui/PageHeader";
import { Tabs } from "../components/ui/Tabs";
import { GradeBuilderTab } from "./faculty/GradeBuilderTab";
import { ProfessorsTab } from "./faculty/ProfessorsTab";

type Tab = "grade" | "professores";

const TABS: Array<{ key: Tab; label: string; icon: typeof Building2 }> = [
  { key: "grade", label: "Montar Grade", icon: Building2 },
  { key: "professores", label: "Meus Professores", icon: Users },
];

export function FacultyProfessors() {
  usePageTitle("Montar Grade");
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") === "professores" ? "professores" : "grade";
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);

  const goToTab = (tab: Tab) => {
    setActiveTab(tab);
    setSearchParams(tab === "grade" ? {} : { tab }, { replace: true });
  };

  return (
    <div>
      <PageHeader title="Montar Grade" />

      <Tabs tabs={TABS} active={activeTab} onChange={goToTab} ariaLabel="Seções de grade e professores" />

      {activeTab === "grade" ? <GradeBuilderTab /> : <ProfessorsTab />}
    </div>
  );
}
