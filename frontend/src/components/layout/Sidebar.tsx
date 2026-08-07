import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  BookOpen,
  CalendarRange,
  Users,
  UserRound,
  Settings,
  NotebookPen,
} from "lucide-react";

const links = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/materias", label: "Matérias", icon: BookOpen },
  { to: "/periodos", label: "Períodos", icon: CalendarRange },
  { to: "/professores", label: "Professores", icon: Users },
];

const footerLinks = [
  { to: "/perfil", label: "Perfil", icon: UserRound },
  { to: "/configuracoes", label: "Configurações", icon: Settings },
];

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <span className="sidebar__brand-mark">
          <NotebookPen size={18} strokeWidth={2} />
        </span>
        <span className="sidebar__brand-name">Organizador Acadêmico</span>
      </div>

      <nav className="sidebar__nav">
        <span className="sidebar__section-label">Navegação</span>
        {links.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onNavigate}
            className={({ isActive }) => `sidebar__link${isActive ? " sidebar__link--active" : ""}`}
          >
            <Icon size={17} strokeWidth={2} />
            {label}
          </NavLink>
        ))}
      </nav>

      <nav className="sidebar__nav sidebar__nav--footer">
        {footerLinks.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onNavigate}
            className={({ isActive }) => `sidebar__link${isActive ? " sidebar__link--active" : ""}`}
          >
            <Icon size={17} strokeWidth={2} />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
