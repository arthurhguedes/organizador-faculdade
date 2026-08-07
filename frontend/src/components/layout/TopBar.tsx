import { Menu } from "lucide-react";
import { PeriodSwitcher } from "./PeriodSwitcher";
import { NotificationBell } from "./NotificationBell";
import { StreakChip } from "./StreakChip";

export function TopBar({ title, onMenuClick }: { title: string; onMenuClick: () => void }) {
  return (
    <header className="topbar">
      <button type="button" className="topbar__menu-btn" onClick={onMenuClick} aria-label="Abrir menu">
        <Menu size={20} strokeWidth={2} />
      </button>
      <h1 className="topbar__title">{title}</h1>
      <div className="topbar__spacer" />
      <StreakChip />
      <NotificationBell />
      <PeriodSwitcher />
    </header>
  );
}
