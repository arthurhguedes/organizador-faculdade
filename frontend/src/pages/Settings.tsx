import { Sun, Moon } from "lucide-react";
import { usePageTitle } from "../context/PageTitleContext";
import { useTheme } from "../context/ThemeContext";
import { ComingSoon } from "../components/ui/ComingSoon";
import { PageHeader } from "../components/ui/PageHeader";

export function Settings() {
  usePageTitle("Configurações");
  const { theme, setTheme } = useTheme();

  return (
    <div>
      <PageHeader title="Configurações" description="Preferências do app." />

      <section className="hub-section">
        <h3>Aparência</h3>
        <div className="theme-picker">
          <button
            type="button"
            className={`theme-option${theme === "dark" ? " theme-option--active" : ""}`}
            onClick={() => setTheme("dark")}
          >
            <Moon size={16} strokeWidth={2} />
            Preto e vinho
          </button>
          <button
            type="button"
            className={`theme-option${theme === "light" ? " theme-option--active" : ""}`}
            onClick={() => setTheme("light")}
          >
            <Sun size={16} strokeWidth={2} />
            Branco e vinho
          </button>
        </div>
      </section>

      <ComingSoon
        title="Mais configurações"
        description="O resto ainda não está implementado."
        items={["Notificações de provas e atividades", "Exportar dados", "Coeficiente de rendimento geral"]}
      />
    </div>
  );
}
