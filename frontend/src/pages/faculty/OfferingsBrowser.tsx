import { useMemo, useState } from "react";
import { Search, Plus, Check, Users } from "lucide-react";
import type { Offering } from "../../api/types";
import { EmptyState } from "../../components/ui/EmptyState";
import { Badge } from "../../components/ui/Badge";

function summarizeSchedule(offering: Offering): string {
  if (offering.schedules.length === 0) return "sem horário definido";
  const byDay = new Map<string, string[]>();
  for (const slot of offering.schedules) {
    const list = byDay.get(slot.weekday) ?? [];
    list.push(`${slot.startTime}`);
    byDay.set(slot.weekday, list);
  }
  return [...byDay.entries()]
    .map(([day, times]) => `${day.slice(0, 3)} ${times[0]}`)
    .join(" · ");
}

export function OfferingsBrowser({
  offerings,
  isSelected,
  onToggle,
}: {
  offerings: Offering[];
  isSelected: (id: number) => boolean;
  onToggle: (id: number) => void;
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return offerings;
    return offerings.filter((o) =>
      [o.professorName, o.subjectCode, o.subjectName, o.curso, o.depto]
        .filter(Boolean)
        .some((field) => field!.toLowerCase().includes(q)),
    );
  }, [offerings, query]);

  const grouped = useMemo(() => {
    const map = new Map<string, Offering[]>();
    for (const offering of filtered) {
      const key = offering.professorName ?? "Sem professor definido";
      const list = map.get(key) ?? [];
      list.push(offering);
      map.set(key, list);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered]);

  return (
    <div>
      <div className="faculty-search">
        <Search size={16} strokeWidth={2} />
        <input
          type="search"
          placeholder="Buscar por professor, código ou nome da disciplina..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {grouped.length === 0 ? (
        <EmptyState icon={Users} title="Nenhum resultado" description="Tente outro termo de busca." />
      ) : (
        <div className="professor-accordion">
          {grouped.map(([professor, group]) => (
            <details key={professor} className="professor-group">
              <summary>
                <span>{professor}</span>
                <Badge tone="neutral">{group.length} turma{group.length !== 1 ? "s" : ""}</Badge>
              </summary>
              <ul className="offering-list">
                {group.map((offering) => {
                  const selected = isSelected(offering.id);
                  return (
                    <li key={offering.id} className="offering-row">
                      <div className="offering-row__main">
                        <span className="offering-row__title">
                          {offering.subjectCode} — {offering.subjectName}
                        </span>
                        <span className="offering-row__meta">
                          Turma {offering.turma}
                          {offering.curso ? ` · ${offering.curso}` : ""}
                          {offering.vagas !== null ? ` · ${offering.vagas} vagas` : ""}
                          {" · "}
                          {summarizeSchedule(offering)}
                        </span>
                      </div>
                      <button
                        type="button"
                        className={`offering-row__toggle${selected ? " offering-row__toggle--active" : ""}`}
                        onClick={() => onToggle(offering.id)}
                      >
                        {selected ? <Check size={14} strokeWidth={2} /> : <Plus size={14} strokeWidth={2} />}
                        {selected ? "Na grade" : "Adicionar"}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
