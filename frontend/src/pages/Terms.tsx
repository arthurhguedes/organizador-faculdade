import { usePageTitle } from "../context/PageTitleContext";

export function Terms() {
  usePageTitle("Termos de uso");

  return (
    <div className="prose-page">
      <p className="prose-page__updated">Última atualização: projeto em desenvolvimento</p>

      <h3>1. Sobre este app</h3>
      <p>
        O Organizador Acadêmico é um projeto pessoal para organizar matérias, horários, atividades e provas.
        Os dados são inseridos manualmente por você e ficam armazenados no banco de dados do projeto.
      </p>

      <h3>2. Uso dos dados</h3>
      <p>
        Este é um texto placeholder. Enquanto o projeto está em desenvolvimento, não há garantias formais de
        disponibilidade, backup ou retenção dos dados cadastrados.
      </p>

      <h3>3. Sem garantias</h3>
      <p>
        O app é fornecido "como está", sem garantias de funcionamento ininterrupto. Funcionalidades podem mudar
        conforme o projeto evolui.
      </p>

      <h3>4. Contato</h3>
      <p>Página de termos ainda em elaboração — o texto final será revisado antes de qualquer uso além do pessoal.</p>
    </div>
  );
}
