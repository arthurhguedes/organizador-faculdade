import { useState } from "react";
import { Link } from "react-router-dom";
import { Bell, Download, GraduationCap, ScrollText } from "lucide-react";
import { usePageTitle } from "../context/PageTitleContext";
import { useToast } from "../context/ToastContext";
import { exportAcademicData } from "../lib/dataExport";
import { PageHeader } from "../components/ui/PageHeader";
import { FeatureRow } from "../components/ui/FeatureRow";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";

export function Settings() {
  usePageTitle("Configurações");
  const { notify } = useToast();
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportAcademicData();
      notify("Dados exportados", "success");
    } catch {
      notify("Não foi possível exportar os dados", "error");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div>
      <PageHeader title="Configurações" description="Preferências e informações do app." />

      <section className="hub-section">
        <h3>Sobre</h3>
        <div className="about-card">
          <div>
            <p className="about-card__name">Notary</p>
            <p className="about-card__description">
              App pessoal para organizar matérias, horários, atividades, provas e notas — com importação da
              planilha de ofertas e do histórico da faculdade.
            </p>
          </div>
          <Badge tone="warning">Em desenvolvimento</Badge>
        </div>
        <Link to="/termos" className="link-with-icon">
          Ver termos de uso
        </Link>
      </section>

      <section className="hub-section">
        <h3>Preferências</h3>
        <div className="feature-row-list">
          <FeatureRow
            icon={Bell}
            title="Notificações"
            description="Avisos de provas e atividades chegando perto do prazo, direto no sino do topo da tela."
            action={<Badge tone="accent">Ativo</Badge>}
          />
          <FeatureRow
            icon={Download}
            title="Exportar dados"
            description="Baixe suas matérias, notas e horários em uma planilha."
            action={
              <Button variant="ghost" icon={Download} loading={exporting} onClick={handleExport}>
                Exportar
              </Button>
            }
          />
          <FeatureRow
            icon={GraduationCap}
            title="Coeficiente de rendimento geral"
            description="Média entre todas as matérias, ponderada pela carga horária."
          />
          <FeatureRow
            icon={ScrollText}
            title="Boletim / histórico automático"
            description="Importe notas e período de semestres passados a partir do histórico da faculdade."
            action={
              <Link to="/periodos">
                <Button variant="ghost">Importar</Button>
              </Link>
            }
          />
        </div>
      </section>
    </div>
  );
}
