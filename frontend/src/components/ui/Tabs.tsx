import type { ComponentType } from "react";

type TabIcon = ComponentType<{ size?: number; strokeWidth?: number }>;

export type TabItem<T extends string> = {
  key: T;
  label: string;
  icon?: TabIcon;
};

export function Tabs<T extends string>({
  tabs,
  active,
  onChange,
  ariaLabel,
}: {
  tabs: Array<TabItem<T>>;
  active: T;
  onChange: (tab: T) => void;
  ariaLabel: string;
}) {
  return (
    <div className="tabs" role="tablist" aria-label={ariaLabel}>
      {tabs.map(({ key, label, icon: Icon }) => (
        <button
          key={key}
          type="button"
          role="tab"
          id={`tab-${key}`}
          aria-selected={active === key}
          aria-controls={`tabpanel-${key}`}
          className={`tabs__tab${active === key ? " tabs__tab--active" : ""}`}
          onClick={() => onChange(key)}
        >
          {Icon && <Icon size={15} strokeWidth={1.75} />}
          {label}
        </button>
      ))}
    </div>
  );
}
