import { usePageTitle } from "../context/PageTitleContext";
import { ComingSoon } from "../components/ui/ComingSoon";

export function Settings() {
  usePageTitle("Configurações");

  return (
    <ComingSoon
      title="Configurações"
      description="Esta área ainda não está implementada. Aqui você vai poder ajustar preferências do app."
      items={["Tema claro/escuro", "Notificações de provas e atividades", "Exportar dados", "Coeficiente de rendimento geral"]}
    />
  );
}
