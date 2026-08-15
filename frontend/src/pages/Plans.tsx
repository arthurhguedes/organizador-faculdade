import { useRef, useState, type CSSProperties, type MouseEvent } from "react";
import { Check, Crown, Sparkles } from "lucide-react";
import { usePageTitle } from "../context/PageTitleContext";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";
import { useAnimatedNumber } from "../hooks/useAnimatedNumber";
import { ApiError } from "../api/client";
import { PageHeader } from "../components/ui/PageHeader";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";

type Billing = "monthly" | "yearly";

type Plan = {
  id: string;
  name: string;
  tagline: string;
  icon: typeof Sparkles;
  priceMonthly: number;
  priceYearly: number;
  featured: boolean;
  ctaLabel: string;
  ctaDisabled?: boolean;
  features: string[];
};

const plans: Plan[] = [
  {
    id: "gratis",
    name: "Gratuito",
    tagline: "O que você já usa hoje, sem custo.",
    icon: Sparkles,
    priceMonthly: 0,
    priceYearly: 0,
    featured: false,
    ctaLabel: "Plano atual",
    ctaDisabled: true,
    features: [
      "Matérias, horários, atividades e provas sem limite",
      "Cálculo de média por matéria",
      "Montador de grade com detecção de conflito",
      "Importação de matrícula e histórico da faculdade",
      "Catálogo de ofertas por professor e disciplina",
      "Contagem de faltas por matéria, com limite de 25% da carga horária",
    ],
  },
  {
    id: "premium",
    name: "Premium",
    tagline: "Pra quem quer a faculdade inteira num só painel.",
    icon: Crown,
    priceMonthly: 20,
    priceYearly: 192,
    featured: true,
    ctaLabel: "Assinar Premium",
    features: [
      "Tudo do plano Gratuito",
      "Matriz curricular com progresso do curso e o que falta pra concluir",
      "Coeficiente de rendimento geral entre matérias",
      "Notificações de provas e atividades chegando perto do prazo",
      "Exportar dados em PDF e CSV",
      "Boletim automático a partir do histórico escolar",
      "Proteção de sequência: um dia sem abrir o app não zera seu streak",
      "XP em dobro em todas as conquistas",
      "Suporte prioritário",
    ],
  },
];

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function PlanCard({
  plan,
  billing,
  index,
  premiumActive,
}: {
  plan: Plan;
  billing: Billing;
  index: number;
  premiumActive: boolean;
}) {
  const { notify } = useToast();
  const { updatePlan } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const isPremiumPlan = plan.id === "premium";

  const monthlyEquivalent = billing === "monthly" ? plan.priceMonthly : plan.priceYearly / 12;
  const displayedPrice = useAnimatedNumber(monthlyEquivalent);
  const Icon = plan.icon;

  function handlePointerMove(event: MouseEvent<HTMLDivElement>) {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width;
    const py = (event.clientY - rect.top) / rect.height;
    card.style.setProperty("--rotate-x", `${(0.5 - py) * 8}deg`);
    card.style.setProperty("--rotate-y", `${(px - 0.5) * 8}deg`);
    card.style.setProperty("--spot-x", `${px * 100}%`);
    card.style.setProperty("--spot-y", `${py * 100}%`);
  }

  function handlePointerLeave() {
    const card = cardRef.current;
    if (!card) return;
    card.style.setProperty("--rotate-x", "0deg");
    card.style.setProperty("--rotate-y", "0deg");
    card.style.setProperty("--spot-y", "-20%");
  }

  async function handleSubscribe() {
    if (!isPremiumPlan) {
      notify("Assinaturas ainda não estão disponíveis — essa é só a base visual, pagamento vem depois.", "success");
      return;
    }

    const willActivate = !premiumActive;
    setSubmitting(true);
    try {
      await updatePlan(willActivate ? { plan: "premium", billingCycle: billing } : { plan: "free" });
      notify(
        willActivate
          ? "Prévia do Premium ativada na sua conta — proteção de sequência e XP em dobro já valendo."
          : "Prévia do Premium desativada.",
        "success",
      );
    } catch (err) {
      notify(err instanceof ApiError ? err.message : "Erro ao atualizar o plano", "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      ref={cardRef}
      className={`plan-card${plan.featured ? " plan-card--featured" : ""}`}
      style={{ "--i": index } as CSSProperties}
      onMouseMove={handlePointerMove}
      onMouseLeave={handlePointerLeave}
    >
      {plan.featured && (
        <span className="plan-card__ribbon">
          <Crown size={12} strokeWidth={2.5} />
          Mais popular
        </span>
      )}

      <div className="plan-card__header">
        <span className="plan-card__icon">
          <Icon size={18} strokeWidth={2} />
        </span>
        <div>
          <p className="plan-card__name">{plan.name}</p>
          <p className="plan-card__tagline">{plan.tagline}</p>
        </div>
      </div>

      <div className="plan-card__price">
        <span className="plan-card__price-currency">R$</span>
        <span className="plan-card__price-value">
          {displayedPrice.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
        <span className="plan-card__price-period">/mês</span>
      </div>
      <p className="plan-card__price-note">
        {plan.priceMonthly === 0
          ? "Sempre gratuito"
          : billing === "yearly"
            ? `Cobrado ${currency.format(plan.priceYearly)} por ano`
            : "Cobrado mensalmente"}
      </p>

      {isPremiumPlan && premiumActive && (
        <span className="plan-card__preview-badge">
          <Badge tone="accent">Prévia ativa na sua conta</Badge>
        </span>
      )}

      <Button
        variant={isPremiumPlan && premiumActive ? "secondary" : plan.featured ? "primary" : "secondary"}
        className="plan-card__cta"
        disabled={plan.ctaDisabled}
        loading={submitting}
        loadingText="Atualizando..."
        onClick={handleSubscribe}
      >
        {isPremiumPlan && premiumActive ? "Cancelar prévia Premium" : plan.ctaLabel}
      </Button>

      <ul className="plan-card__features">
        {plan.features.map((feature, featureIndex) => (
          <li className="plan-card__feature" style={{ "--i": featureIndex } as CSSProperties} key={feature}>
            <span className="plan-card__feature-icon">
              <Check size={13} strokeWidth={3} />
            </span>
            {feature}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Plans() {
  usePageTitle("Planos");
  const [billing, setBilling] = useState<Billing>("monthly");
  const { user } = useAuth();
  const premium = user?.plan === "premium";

  return (
    <div className="plans-page">
      <div className="plans-page__backdrop" aria-hidden="true" />

      <PageHeader
        title="Planos"
        description="Uma base de teste — assinaturas ainda não existem de verdade, isso aqui é só a vitrine."
        action={<Badge tone="warning">Em desenvolvimento</Badge>}
      />

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

      <div className="plans-grid">
        {plans.map((plan, index) => (
          <PlanCard plan={plan} billing={billing} index={index} premiumActive={premium} key={plan.id} />
        ))}
      </div>

      <p className="plans-page__disclaimer">
        Nenhuma cobrança real acontece por aqui ainda. Assinar o Premium já libera de verdade a proteção de sequência
        e o XP em dobro na sua conta, pra você sentir o efeito antes do pagamento existir.
      </p>
    </div>
  );
}
