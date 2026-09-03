import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { FileCheck, FileSpreadsheet } from "lucide-react";
import { usePageTitle } from "../context/PageTitleContext";
import { PageHeader } from "../components/ui/PageHeader";
import { Tabs } from "../components/ui/Tabs";
import { HistoricoTab } from "./import/HistoricoTab";
import { OfferingsTab } from "./import/OfferingsTab";

type Tab = "historico" | "oferta";

const TABS: Array<{ key: Tab; label: string; icon: typeof FileCheck }> = [
  { key: "historico", label: "Histórico Escolar", icon: FileCheck },
  { key: "oferta", label: "Planilha de Oferta", icon: FileSpreadsheet },
];

export function Import() {
  usePageTitle("Importar");
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") === "oferta" ? "oferta" : "historico";
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);

  const goToTab = (tab: Tab) => {
    setActiveTab(tab);
    setSearchParams(tab === "historico" ? {} : { tab }, { replace: true });
  };

  return (
    <div>
      <PageHeader title="Importar" description="Traga dados prontos da faculdade em vez de cadastrar tudo na mão." />

      <Tabs tabs={TABS} active={activeTab} onChange={goToTab} ariaLabel="Origens de importação" />

      {activeTab === "historico" ? <HistoricoTab /> : <OfferingsTab />}
    </div>
  );
}
