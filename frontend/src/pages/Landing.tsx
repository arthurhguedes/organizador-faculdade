import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  FileUp,
  GraduationCap,
  Timer,
  ShieldAlert,
  ArrowRight,
  Check,
  Minus,
  AlertTriangle,
  CheckCircle,
  Sparkles,
  Crown,
  Sun,
  Moon,
  LogIn,
  UserPlus,
  ChevronDown,
} from "lucide-react";
import { useTheme } from "../context/ThemeContext";

type Billing = "monthly" | "yearly";

const before = [
  "Notas espalhadas entre prints, planilhas soltas e conversa de WhatsApp",
  "Prazo de prova ou atividade perdido porque ninguém avisou",
  "Preencher matrícula e histórico à mão de novo, todo semestre",
  "Abrir cinco abas do portal só pra montar a grade sem bater horário",
];

const after = [
  "Toda matéria, horário, prazo e nota num painel só",
  "Média de cada matéria calculada sozinha, com o peso que cada professor usa",
  "Matrícula, histórico e plano de ensino importados do PDF em segundos",
  "Grade montada a partir do catálogo da faculdade, sem conflito de horário",
];

const compactFeatures: { icon: typeof BookOpen; title: string; description: string }[] = [
  {
    icon: BookOpen,
    title: "Matéria como hub central",
    description: "Horário, atividades, provas, faltas e média de cada matéria juntos numa única página.",
  },
  {
    icon: CalendarDays,
    title: "Calendário completo",
    description: "Aulas da semana, provas, atividades e o cronograma do plano de ensino, tudo no mesmo mês.",
  },
  {
    icon: ClipboardCheck,
    title: "Peso de prova é seu",
    description: "Cada professor pesa diferente — você define o peso, o Notary só faz a conta.",
  },
  {
    icon: GraduationCap,
    title: "Matriz curricular",
    description: "Acompanhe o progresso do curso inteiro por carga horária, matéria por matéria.",
  },
  {
    icon: Timer,
    title: "Pomodoro e horas de estudo",
    description: "Cronometre o foco e veja quanto tempo você dedicou a cada matéria.",
  },
  {
    icon: ShieldAlert,
    title: "Controle de faltas",
    description: "Contador por matéria com aviso ao chegar perto do limite de 25% da carga horária.",
  },
];

const faqItems: { question: string; answer: string }[] = [
  {
    question: "É de graça?",
    answer:
      "É. O plano Gratuito não tem prazo de expiração nem limite de matérias, horários, provas ou atividades — dá pra usar o semestre inteiro sem pagar nada.",
  },
  {
    question: "Preciso de cartão de crédito pra criar conta?",
    answer: "Não. Criar conta e usar o plano Gratuito não pede nenhum dado de pagamento.",
  },
  {
    question: "Meus dados ficam salvos onde?",
    answer:
      "No seu próprio banco de dados na nuvem, vinculado só à sua conta. Nada é compartilhado com outros usuários ou com a faculdade.",
  },
  {
    question: "O app ainda tá em desenvolvimento — dá pra confiar?",
    answer:
      "Dá. É um projeto real, em uso e evolução constante — não uma maquete. O que ainda não existe aparece como \"Em breve\", nunca escondido ou quebrado.",
  },
];

const freeFeatures = [
  "Matérias, horários, atividades e provas sem limite",
  "Cálculo de média por matéria",
  "Montador de grade com detecção de conflito",
  "Importação de matrícula, histórico e plano de ensino",
];

const premiumFeatures = [
  "Tudo do plano Gratuito",
  "Matriz curricular com progresso do curso",
  "Coeficiente de rendimento geral entre matérias",
  "Notificações de prazos chegando perto",
  "Exportar dados em PDF e CSV",
];

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function Section({ id, className, children }: { id?: string; className: string; children: ReactNode }) {
  return (
    <section id={id} className={className}>
      {children}
    </section>
  );
}

export function Landing() {
  const { theme, toggleTheme } = useTheme();
  const [billing, setBilling] = useState<Billing>("monthly");

  useEffect(() => {
    document.title = "Notary — Organize sua vida acadêmica";
  }, []);

  const premiumMonthly = billing === "monthly" ? 20 : 192 / 12;

  return (
    <div className="landing">
      <div className="landing__backdrop" aria-hidden="true" />

      <header className="landing__nav">
        <div className="landing__brand">
          <img src="/favicon.svg" alt="" width={30} height={30} />
          <span>Notary</span>
        </div>

        <nav className="landing__nav-links">
          <a href="#recursos">Recursos</a>
          <a href="#sobre">Sobre</a>
          <a href="#duvidas">Dúvidas</a>
          <a href="#planos">Planos</a>
        </nav>

        <div className="landing__nav-actions">
          <button
            type="button"
            className="landing__theme-toggle"
            onClick={toggleTheme}
            aria-label={theme === "dark" ? "Mudar pro tema claro" : "Mudar pro tema escuro"}
          >
            {theme === "dark" ? <Sun size={17} strokeWidth={2} /> : <Moon size={17} strokeWidth={2} />}
          </button>
          <Link to="/login" className="btn btn--secondary">
            <LogIn size={16} strokeWidth={2} />
            Entrar
          </Link>
          <Link to="/registrar" className="btn btn--primary">
            <UserPlus size={16} strokeWidth={2} />
            Criar conta
          </Link>
        </div>
      </header>

      <main>
        <Section className="landing__hero">
          <div className="landing__hero-copy">
            <h1>
              Chega de portal de faculdade bagunçado.
              <span>Organize tudo num lugar só.</span>
            </h1>
            <p>
              Matérias, horários, provas, atividades e notas — o Notary junta o que sua faculdade deveria mostrar
              direito e não mostra. Cadastre uma vez, acompanhe o semestre inteiro.
            </p>
            <div className="landing__hero-ctas">
              <Link to="/registrar" className="btn btn--primary landing__hero-cta">
                Criar conta grátis
                <ArrowRight size={16} strokeWidth={2} />
              </Link>
              <Link to="/login" className="btn btn--secondary landing__hero-cta">
                Já tenho conta
              </Link>
            </div>
            <p className="landing__hero-meta">
              Leva menos de 1 minuto pra criar sua conta. Sempre gratuito no plano básico, sem cartão de crédito.
            </p>
          </div>

          <div className="landing__hero-visual">
            <div className="landing__ledger" aria-hidden="true">
              <div className="landing__ledger-header">
                <span>Matéria</span>
                <span>Horário</span>
                <span>Média</span>
              </div>
              {[
                { name: "Cálculo II", time: "Seg 08:00", grade: "8.7" },
                { name: "Banco de Dados", time: "Ter 10:00", grade: "9.2" },
                { name: "Redes de Computadores", time: "Qui 14:00", grade: "7.5" },
                { name: "Engenharia de Software", time: "Sex 08:00", grade: "9.8" },
              ].map((row, i) => (
                <div className="landing__ledger-row" style={{ "--i": i } as CSSProperties} key={row.name}>
                  <span>{row.name}</span>
                  <span className="landing__ledger-time">{row.time}</span>
                  <span className="landing__ledger-grade">{row.grade}</span>
                </div>
              ))}
              <div className="landing__ledger-footer">
                <span>Coeficiente geral</span>
                <span className="landing__ledger-grade landing__ledger-grade--total">8.9</span>
              </div>
            </div>
            <p className="landing__hero-visual-caption">Exemplo de como fica sua matriz de notas</p>
          </div>
        </Section>

        <Section className="landing__compare">
          <div className="landing__compare-grid">
            <div className="landing__compare-col landing__compare-col--before">
              <span className="landing__compare-label">Sem o Notary</span>
              <ul className="landing__compare-list">
                {before.map((item) => (
                  <li key={item}>
                    <Minus size={15} strokeWidth={2.5} />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="landing__compare-col landing__compare-col--after">
              <span className="landing__compare-label">Com o Notary</span>
              <ul className="landing__compare-list">
                {after.map((item) => (
                  <li key={item}>
                    <Check size={15} strokeWidth={2.5} />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Section>

        <Section id="recursos" className="landing__spotlight">
          <div className="landing__section-head">
            <h2>Feito pra resolver os dois maiores incômodos</h2>
            <p>Não é só uma lista bonita de matérias — o Notary faz o trabalho manual por você.</p>
          </div>

          <div className="landing__spotlight-row">
            <div className="landing__spotlight-copy">
              <h3>Pare de digitar tudo de novo</h3>
              <p>
                Envie o PDF do atestado de matrícula, do histórico escolar ou do plano de ensino do professor — o
                Notary lê e organiza sozinho, com matéria, turma, professor e cronograma de aula já preenchidos.
              </p>
            </div>
            <div className="landing__spotlight-visual">
              <div className="landing__demo-card">
                <div className="landing__demo-file">
                  <span className="landing__demo-file-icon">
                    <FileUp size={16} strokeWidth={2} />
                  </span>
                  atestado_matricula.pdf
                </div>
                <div className="landing__demo-rows">
                  {["Cálculo II — T01", "Banco de Dados — T02", "Redes de Computadores — T03"].map((row, i) => (
                    <div className="landing__demo-row" style={{ "--i": i } as CSSProperties} key={row}>
                      <strong>{row}</strong>
                      <CheckCircle size={15} strokeWidth={2} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="landing__spotlight-row landing__spotlight-row--reverse">
            <div className="landing__spotlight-copy">
              <h3>Monte a grade sem bater horário</h3>
              <p>
                Importe a planilha de oferta que a sua faculdade já disponibiliza por semestre, filtre por professor
                e escolha as turmas — o Notary avisa na hora se duas batem no mesmo horário.
              </p>
            </div>
            <div className="landing__spotlight-visual">
              <div className="landing__demo-card">
                <div className="landing__demo-schedule">
                  <div className="landing__demo-slot-group">
                    <div className="landing__demo-slot landing__demo-slot--conflict">
                      <strong>Cálculo II</strong> — Seg 08:00–10:00
                    </div>
                    <div className="landing__demo-slot landing__demo-slot--conflict">
                      <strong>Física I</strong> — Seg 09:00–11:00
                    </div>
                    <span className="landing__demo-flag landing__demo-flag--danger">
                      <AlertTriangle size={14} strokeWidth={2.5} />
                      Conflito de horário
                    </span>
                  </div>
                  <div className="landing__demo-slot-group">
                    <div className="landing__demo-slot">
                      <strong>Banco de Dados</strong> — Ter 10:00–12:00
                    </div>
                    <span className="landing__demo-flag landing__demo-flag--ok">
                      <CheckCircle size={14} strokeWidth={2.5} />
                      Sem conflito
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Section>

        <Section className="landing__compact-features">
          <div className="landing__compact-features-list">
            {compactFeatures.map(({ icon: Icon, title, description }) => (
              <div className="landing__compact-feature" key={title}>
                <span className="landing__compact-feature-icon">
                  <Icon size={17} strokeWidth={2} />
                </span>
                <div>
                  <p className="landing__compact-feature-title">{title}</p>
                  <p className="landing__compact-feature-description">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section id="sobre" className="landing__about">
          <h2>Por que o Notary existe</h2>
          <p>
            O site da faculdade não oferece exportação de dados e é difícil de navegar — então os dados ficam
            espalhados entre prints, planilhas e conversas de WhatsApp. O Notary nasceu como um projeto pessoal,
            construído enquanto eu mesmo curso a faculdade, pra resolver exatamente esse problema: um lugar só,
            feito pra estudante, pra guardar matérias, horários, provas e notas.
          </p>
          <p className="landing__about-pullquote">
            Nada de planilha solta pra manter atualizada — <strong>o que sua faculdade já te entrega em PDF ou
            planilha, o Notary importa sozinho.</strong>
          </p>
        </Section>

        <Section id="duvidas" className="landing__faq">
          <h2>Perguntas frequentes</h2>
          <div className="landing__faq-list">
            {faqItems.map(({ question, answer }) => (
              <details className="landing__faq-item" key={question}>
                <summary>
                  {question}
                  <ChevronDown size={18} strokeWidth={2} />
                </summary>
                <p>{answer}</p>
              </details>
            ))}
          </div>
        </Section>

        <Section id="planos" className="landing__plans">
          <div className="landing__section-head">
            <h2>Planos</h2>
            <p>Comece de graça. Assine o Premium quando quiser o curso inteiro num painel só.</p>
          </div>

          <div className="billing-toggle" role="tablist" aria-label="Ciclo de cobrança">
            <button
              type="button"
              role="tab"
              aria-selected={billing === "monthly"}
              className={`billing-toggle__option${billing === "monthly" ? " billing-toggle__option--active" : ""}`}
              onClick={() => setBilling("monthly")}
            >
              Mensal
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={billing === "yearly"}
              className={`billing-toggle__option${billing === "yearly" ? " billing-toggle__option--active" : ""}`}
              onClick={() => setBilling("yearly")}
            >
              Anual
              <span className="billing-toggle__save">-20%</span>
            </button>
            <span className={`billing-toggle__thumb billing-toggle__thumb--${billing}`} />
          </div>

          <div className="landing__plans-grid">
            <div className="landing__plan-card">
              <div className="landing__plan-card-header">
                <span className="landing__plan-icon">
                  <Sparkles size={18} strokeWidth={2} />
                </span>
                <p className="landing__plan-name">Gratuito</p>
              </div>
              <p className="landing__plan-price">
                <span>R$ 0</span>/mês
              </p>
              <p className="landing__plan-price-note">Sempre gratuito</p>
              <ul className="landing__plan-features">
                {freeFeatures.map((f) => (
                  <li key={f}>
                    <Check size={13} strokeWidth={3} />
                    {f}
                  </li>
                ))}
              </ul>
              <Link to="/registrar" className="btn btn--secondary landing__plan-cta">
                Criar conta grátis
              </Link>
            </div>

            <div className="landing__plan-card landing__plan-card--featured">
              <span className="landing__plan-ribbon">
                <Crown size={12} strokeWidth={2.5} />
                Mais completo
              </span>
              <div className="landing__plan-card-header">
                <span className="landing__plan-icon">
                  <Crown size={18} strokeWidth={2} />
                </span>
                <p className="landing__plan-name">Premium</p>
              </div>
              <p className="landing__plan-price">
                <span>R$ {premiumMonthly.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                /mês
              </p>
              <p className="landing__plan-price-note">
                {billing === "yearly" ? `Cobrado ${currency.format(192)} por ano` : "Cobrado mensalmente"}
              </p>
              <ul className="landing__plan-features">
                {premiumFeatures.map((f) => (
                  <li key={f}>
                    <Check size={13} strokeWidth={3} />
                    {f}
                  </li>
                ))}
              </ul>
              <Link to="/registrar" className="btn btn--primary landing__plan-cta">
                Assinar Premium
              </Link>
            </div>
          </div>
        </Section>

        <Section className="landing__final-cta">
          <h2>Pronto pra parar de anotar tudo espalhado?</h2>
          <p>Cadastre suas matérias em minutos e deixe o Notary calcular o resto.</p>
          <Link to="/registrar" className="btn btn--primary landing__hero-cta">
            Criar conta grátis
            <ArrowRight size={16} strokeWidth={2} />
          </Link>
        </Section>
      </main>

      <footer className="landing__footer">
        <div className="landing__brand">
          <img src="/favicon.svg" alt="" width={22} height={22} />
          <span>Notary</span>
        </div>
        <p>Projeto pessoal em desenvolvimento — sua vida acadêmica organizada num só lugar.</p>
      </footer>
    </div>
  );
}
