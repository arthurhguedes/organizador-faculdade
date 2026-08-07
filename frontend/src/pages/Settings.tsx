import { Link } from "react-router-dom";
import { Bell, Download, GraduationCap, ScrollText } from "lucide-react";
import { usePageTitle } from "../context/PageTitleContext";
import { PageHeader } from "../components/ui/PageHeader";
import { FeatureRow } from "../components/ui/FeatureRow";
import { Badge } from "../components/ui/Badge";

export function Settings() {
  usePageTitle("Configurações");

  return (
    <div>
      <PageHeader title="Configurações" description="Preferências e informações do app." />

      <section className="hub-section">
        <h3>Sobre</h3>
        <div className="about-card">
          <div>
            <p className="about-card__name">Organizador Acadêmico</p>
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
            description="Avisos de provas e atividades chegando perto do prazo."
          />
          <FeatureRow
            icon={Download}
            title="Exportar dados"
            description="Baixar suas matérias, notas e horários em um arquivo."
          />
          <FeatureRow
            icon={GraduationCap}
            title="Coeficiente de rendimento geral"
            description="Média entre todas as matérias, ponderada pela carga horária."
          />
          <FeatureRow
            icon={ScrollText}
            title="Boletim / histórico automático"
            description="Importar notas e coeficiente de semestres passados a partir de outros documentos."
          />
        </div>
      </section>
    </div>
  );
}
