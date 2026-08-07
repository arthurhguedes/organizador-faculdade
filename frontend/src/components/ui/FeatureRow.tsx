import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Badge } from "./Badge";

export function FeatureRow({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="feature-row">
      <div className="feature-row__icon">
        <Icon size={18} strokeWidth={1.75} />
      </div>
      <div className="feature-row__text">
        <p className="feature-row__title">{title}</p>
        <p className="feature-row__description">{description}</p>
      </div>
      {action ?? <Badge tone="muted">Em breve</Badge>}
    </div>
  );
}
