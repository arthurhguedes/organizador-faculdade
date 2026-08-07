import { useMemo, useState } from "react";
import { Search, Plus, Check, Users, X } from "lucide-react";
import type { Offering } from "../../api/types";
import { EmptyState } from "../../components/ui/EmptyState";
import { Badge } from "../../components/ui/Badge";

type Shift = "manha" | "tarde" | "noite";

const SHIFTS: Shift[] = ["manha", "tarde", "noite"];
const SHIFT_LABELS: Record<Shift, string> = { manha: "Manhã", tarde: "Tarde", noite: "Noite" };

function getShift(startTime: string): Shift {
  const hour = Number(startTime.slice(0, 2));
  if (hour < 12) return "manha";
  if (hour < 18) return "tarde";
  return "noite";
}

function offeringShifts(offering: Offering): Shift[] {
  return [...new Set(offering.schedules.map((slot) => getShift(slot.startTime)))];
}

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
  const [professorFilter, setProfessorFilter] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("");
  const [shiftFilter, setShiftFilter] = useState<Set<Shift>>(new Set());

  const professors = useMemo(() => {
    const set = new Set<string>();
    for (const o of offerings) if (o.professorName) set.add(o.professorName);
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [offerings]);

  const subjects = useMemo(() => {
    const set = new Set<string>();
    for (const o of offerings) set.add(o.subjectName);
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [offerings]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return offerings.filter((o) => {
      if (professorFilter && o.professorName !== professorFilter) return false;
      if (subjectFilter && o.subjectName !== subjectFilter) return false;
      if (shiftFilter.size > 0 && !offeringShifts(o).some((shift) => shiftFilter.has(shift))) return false;
      if (q) {
        const hit = [o.professorName, o.subjectCode, o.subjectName, o.curso, o.depto]
          .filter(Boolean)
          .some((field) => field!.toLowerCase().includes(q));
        if (!hit) return false;
      }
      return true;
    });
  }, [offerings, query, professorFilter, subjectFilter, shiftFilter]);

  const hasActiveFilters = query !== "" || professorFilter !== "" || subjectFilter !== "" || shiftFilter.size > 0;

  function toggleShift(shift: Shift) {
    setShiftFilter((prev) => {
      const next = new Set(prev);
      if (next.has(shift)) next.delete(shift);
      else next.add(shift);
      return next;
    });
  }

  function clearFilters() {
    setQuery("");
    setProfessorFilter("");
    setSubjectFilter("");
    setShiftFilter(new Set());
  }

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

      <div className="faculty-filters">
        <select
          className="faculty-filters__select"
          value={professorFilter}
          onChange={(e) => setProfessorFilter(e.target.value)}
          aria-label="Filtrar por professor"
        >
          <option value="">Todos os professores</option>
          {professors.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>

        <select
          className="faculty-filters__select"
          value={subjectFilter}
          onChange={(e) => setSubjectFilter(e.target.value)}
          aria-label="Filtrar por disciplina"
        >
          <option value="">Todas as disciplinas</option>
          {subjects.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <div className="filter-chip-group">
          {SHIFTS.map((shift) => (
            <button
              key={shift}
              type="button"
              className={`filter-chip${shiftFilter.has(shift) ? " filter-chip--active" : ""}`}
              onClick={() => toggleShift(shift)}
            >
              {SHIFT_LABELS[shift]}
            </button>
          ))}
        </div>

        {hasActiveFilters && (
          <button type="button" className="faculty-filters__clear" onClick={clearFilters}>
            <X size={14} strokeWidth={2} />
            Limpar filtros
          </button>
        )}
      </div>

      {grouped.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Nenhum resultado"
          description={hasActiveFilters ? "Tente outro filtro ou termo de busca." : "Tente outro termo de busca."}
        />
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
