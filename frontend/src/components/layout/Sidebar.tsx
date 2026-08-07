import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  BookOpen,
  CalendarDays,
  CalendarRange,
  Users,
  Building2,
  UserRound,
  Settings,
  Stamp,
  Sun,
  Moon,
  Crown,
} from "lucide-react";
import { useTheme } from "../../context/ThemeContext";

const links = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/calendario", label: "Calendário", icon: CalendarDays },
  { to: "/materias", label: "Matérias", icon: BookOpen },
  { to: "/periodos", label: "Períodos", icon: CalendarRange },
  { to: "/professores", label: "Meus Professores", icon: Users },
  { to: "/faculdade", label: "Montar Grade", icon: Building2 },
];

const footerLinks = [
  { to: "/perfil", label: "Perfil", icon: UserRound },
  { to: "/planos", label: "Planos", icon: Crown },
  { to: "/configuracoes", label: "Configurações", icon: Settings },
];

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <span className="sidebar__brand-mark">
          <Stamp size={18} strokeWidth={2} />
        </span>
        <span className="sidebar__brand-name">Notary</span>
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
        <button type="button" className="sidebar__link sidebar__theme-toggle" onClick={toggleTheme}>
          {theme === "dark" ? <Sun size={17} strokeWidth={2} /> : <Moon size={17} strokeWidth={2} />}
          {theme === "dark" ? "Tema claro" : "Tema escuro"}
        </button>

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
