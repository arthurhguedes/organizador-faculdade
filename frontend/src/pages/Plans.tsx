import { useEffect, useRef, useState, type CSSProperties, type MouseEvent } from "react";
import { Check, Crown, Sparkles } from "lucide-react";
import { usePageTitle } from "../context/PageTitleContext";
import { useToast } from "../context/ToastContext";
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
    ],
  },
  {
    id: "premium",
    name: "Premium",
    tagline: "Pra quem quer a faculdade inteira num só painel.",
    icon: Crown,
    priceMonthly: 14.9,
    priceYearly: 149,
    featured: true,
    ctaLabel: "Assinar Premium",
    features: [
      "Tudo do plano Gratuito",
      "Coeficiente de rendimento geral entre matérias",
      "Notificações de provas e atividades chegando perto do prazo",
      "Exportar dados em PDF e CSV",
      "Boletim automático a partir do histórico escolar",
      "Suporte prioritário",
    ],
  },
];

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function useAnimatedNumber(target: number, duration = 500) {
  const [value, setValue] = useState(target);
  const prevRef = useRef(target);

  useEffect(() => {
    const from = prevRef.current;
    const to = target;
    if (from === to) return;

    let start: number | null = null;
    let raf = 0;

    function tick(timestamp: number) {
      if (start === null) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      const eased = 1 - (1 - progress) ** 3;
      setValue(from + (to - from) * eased);
      if (progress < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        prevRef.current = to;
      }
    }

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return value;
}

function PlanCard({ plan, billing, index }: { plan: Plan; billing: Billing; index: number }) {
  const { notify } = useToast();
  const cardRef = useRef<HTMLDivElement>(null);

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

  function handleSubscribe() {
    notify("Assinaturas ainda não estão disponíveis — essa é só a base visual, pagamento vem depois.", "success");
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

      <Button
        variant={plan.featured ? "primary" : "secondary"}
        className="plan-card__cta"
        disabled={plan.ctaDisabled}
        onClick={handleSubscribe}
      >
        {plan.ctaLabel}
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
          <span className="billing-toggle__save">-17%</span>
        </button>
        <span className={`billing-toggle__thumb billing-toggle__thumb--${billing}`} />
      </div>

      <div className="plans-grid">
        {plans.map((plan, index) => (
          <PlanCard plan={plan} billing={billing} index={index} key={plan.id} />
        ))}
      </div>

      <p className="plans-page__disclaimer">
        Valores ilustrativos, só pra ver a página funcionando — nenhuma cobrança real acontece por aqui.
      </p>
    </div>
  );
}
