import { useEffect, type CSSProperties, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  Building2,
  FileUp,
  GraduationCap,
  Timer,
  ShieldAlert,
  ArrowRight,
  Check,
  Sparkles,
  Crown,
  Sun,
  Moon,
  LogIn,
  UserPlus,
} from "lucide-react";
import { useTheme } from "../context/ThemeContext";

const features: { icon: typeof BookOpen; title: string; description: string }[] = [
  {
    icon: BookOpen,
    title: "Matérias num só hub",
    description: "Horários, atividades, provas, faltas e média de cada matéria juntos numa única página.",
  },
  {
    icon: CalendarDays,
    title: "Calendário completo",
    description: "Aulas da semana, provas, atividades e o cronograma do plano de ensino, tudo no mesmo mês.",
  },
  {
    icon: ClipboardCheck,
    title: "Médias calculadas pra você",
    description: "Peso de cada prova e atividade é seu — o Notary calcula a média ponderada automaticamente.",
  },
  {
    icon: Building2,
    title: "Montador de grade",
    description: "Importa a planilha de oferta da faculdade e monta sua grade sem conflito de horário.",
  },
  {
    icon: FileUp,
    title: "Importação de PDF",
    description: "Atestado de matrícula, histórico escolar e plano de ensino direto do PDF do professor.",
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

function Section({ id, className, children }: { id?: string; className: string; children: ReactNode }) {
  return (
    <section id={id} className={className}>
      {children}
    </section>
  );
}

export function Landing() {
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    document.title = "Notary — Organize sua vida acadêmica";
  }, []);

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
            <span className="landing__eyebrow">
              <Sparkles size={13} strokeWidth={2.5} />
              Feito pra quem tá cansado de portal de faculdade
            </span>
            <h1>
              Sua vida acadêmica, <span>organizada num só lugar.</span>
            </h1>
            <p>
              Matérias, horários, provas, atividades e notas — o Notary junta tudo o que o site da sua faculdade
              deveria mostrar direito e não mostra. Cadastre uma vez, acompanhe o semestre inteiro.
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
            <p className="landing__hero-meta">Grátis pra começar. Sem cartão de crédito.</p>
          </div>

          <div className="landing__hero-visual" aria-hidden="true">
            <div className="landing__ledger">
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
          </div>
        </Section>

        <Section id="recursos" className="landing__features">
          <div className="landing__section-head">
            <h2>Tudo que você precisa pra não perder nada da faculdade</h2>
            <p>Sem planilha solta, sem post-it, sem abrir cinco abas do portal da faculdade.</p>
          </div>
          <div className="landing__features-grid">
            {features.map(({ icon: Icon, title, description }, i) => (
              <div className="landing__feature-card" style={{ "--i": i } as CSSProperties} key={title}>
                <span className="landing__feature-icon">
                  <Icon size={19} strokeWidth={2} />
                </span>
                <p className="landing__feature-title">{title}</p>
                <p className="landing__feature-description">{description}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section id="sobre" className="landing__about">
          <div className="landing__about-copy">
            <h2>Por que o Notary existe</h2>
            <p>
              O site da faculdade não oferece exportação de dados e é difícil de navegar — então os dados ficam
              espalhados entre prints, planilhas e conversas de WhatsApp. O Notary nasceu como um projeto pessoal
              pra resolver exatamente esse problema: um lugar só, feito pra estudante, pra guardar matérias,
              horários, provas e notas — e ainda importar automaticamente o que a faculdade já disponibiliza em
              PDF ou planilha, em vez de digitar tudo de novo.
            </p>
          </div>
          <div className="landing__about-stats">
            <div className="landing__about-stat">
              <p className="landing__about-stat-value">17</p>
              <p className="landing__about-stat-label">tabelas de dados, um app só</p>
            </div>
            <div className="landing__about-stat">
              <p className="landing__about-stat-value">4</p>
              <p className="landing__about-stat-label">formatos de PDF/planilha importados</p>
            </div>
            <div className="landing__about-stat">
              <p className="landing__about-stat-value">0</p>
              <p className="landing__about-stat-label">planilha solta pra manter atualizada</p>
            </div>
          </div>
        </Section>

        <Section id="planos" className="landing__plans">
          <div className="landing__section-head">
            <h2>Planos</h2>
            <p>Comece de graça. Assine o Premium quando quiser o curso inteiro num painel só.</p>
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
                <span>R$ 20</span>/mês
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
