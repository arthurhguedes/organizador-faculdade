import type { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  action,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-header">
      <div>
        {title && <h2 className="page-header__title">{title}</h2>}
        {description && <p className="page-header__description">{description}</p>}
      </div>
      {action}
    </div>
  );
}
