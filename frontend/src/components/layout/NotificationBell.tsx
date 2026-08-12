import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Bell, ClipboardList } from "lucide-react";
import { usePeriods } from "../../context/PeriodContext";
import { useDashboardData } from "../../hooks/useDashboardData";
import { formatDate, isOverdue, relativeDayLabel } from "../../lib/grades";
import { Badge } from "../ui/Badge";

export function NotificationBell() {
  const { selectedPeriodId } = usePeriods();
  const { upcoming } = useDashboardData(selectedPeriodId !== null ? [selectedPeriodId] : []);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const pending = upcoming
    .filter((item) => item.grade === null && (isOverdue(item.date) || relativeDayLabel(item.date) !== null))
    .sort((a, b) => a.date.localeCompare(b.date));

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div className="notif-bell" ref={rootRef}>
      <button
        type="button"
        className="notif-bell__trigger"
        aria-label={`Notificações${pending.length > 0 ? ` (${pending.length} pendente${pending.length !== 1 ? "s" : ""})` : ""}`}
        onClick={() => setOpen((v) => !v)}
      >
        <Bell size={18} strokeWidth={2} />
        {pending.length > 0 && <span className="notif-bell__badge">{pending.length > 9 ? "9+" : pending.length}</span>}
      </button>

      {open && (
        <div className="notif-panel">
          <div className="notif-panel__header">
            <span>Notificações</span>
            {pending.length > 0 && <span className="notif-panel__count">{pending.length}</span>}
          </div>

          {pending.length === 0 ? (
            <div className="notif-panel__empty">
              <ClipboardList size={20} strokeWidth={1.75} />
              <span>Nenhum prazo pendente por aqui.</span>
            </div>
          ) : (
            <ul className="notif-panel__list">
              {pending.map((item) => (
                <li key={`${item.kind}-${item.id}`} className="notif-panel__item">
                  <Link to={`/materias/${item.subjectId}`} className="notif-panel__link" onClick={() => setOpen(false)}>
                    <span className={`upcoming-item__kind upcoming-item__kind--${item.kind}`}>
                      {item.kind === "exam" ? "Prova" : "Atividade"}
                    </span>
                    <span className="notif-panel__title">{item.title}</span>
                    <span className="notif-panel__subject">{item.subjectName}</span>
                    <span className="notif-panel__date">
                      {formatDate(item.date)}
                      {isOverdue(item.date) ? (
                        <Badge tone="warning">atrasada</Badge>
                      ) : (
                        relativeDayLabel(item.date) && <Badge tone="accent">{relativeDayLabel(item.date)}</Badge>
                      )}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
