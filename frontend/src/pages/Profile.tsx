import { useState, type FormEvent } from "react";
import { Pencil, X, Lock, BookOpen, CalendarRange, Flame, Users } from "lucide-react";
import { usePageTitle } from "../context/PageTitleContext";
import { usePeriods } from "../context/PeriodContext";
import { useToast } from "../context/ToastContext";
import { useEntityList } from "../hooks/useEntityList";
import { useGamification } from "../hooks/useGamification";
import { subjectsApi, professorsApi } from "../api/client";
import { Field } from "../components/ui/Field";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { FeatureRow } from "../components/ui/FeatureRow";

const STORAGE_KEY = "notary:profile";

type LocalProfile = {
  name: string;
  course: string;
};

function loadProfile(): LocalProfile {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return { name: "", course: "" };
  try {
    return JSON.parse(raw);
  } catch {
    return { name: "", course: "" };
  }
}

export function Profile() {
  usePageTitle("Perfil");
  const { notify } = useToast();
  const { periods } = usePeriods();
  const { items: subjects } = useEntityList(subjectsApi);
  const { items: professors } = useEntityList(professorsApi);
  const { streak, xp, level, achievements, loading: gamificationLoading, premium } = useGamification();
  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  const [profile, setProfile] = useState<LocalProfile>(loadProfile);
  const [draft, setDraft] = useState<LocalProfile>(profile);
  const [editing, setEditing] = useState(false);

  const initials =
    profile.name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "?";

  const startEditing = () => {
    setDraft(profile);
    setEditing(true);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    setProfile(draft);
    setEditing(false);
    notify("Perfil salvo", "success");
  };

  return (
    <div className="profile-page">
      {editing ? (
        <form className="inline-form" onSubmit={handleSubmit}>
          <Field label="Nome" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          <Field label="Curso" value={draft.course} onChange={(e) => setDraft({ ...draft, course: e.target.value })} />
          <Button type="submit" variant="primary">
            Salvar
          </Button>
          <Button type="button" variant="ghost" icon={X} onClick={() => setEditing(false)}>
            Cancelar
          </Button>
        </form>
      ) : (
        <div className="profile-card">
          <div className="profile-avatar">{initials}</div>
          <div className="profile-card__info">
            <p className="profile-card__name">{profile.name || "Sem nome"}</p>
            <p className="profile-card__course">{profile.course || "Curso não informado"}</p>
          </div>
          <Button variant="ghost" icon={Pencil} onClick={startEditing}>
            Editar
          </Button>
        </div>
      )}

      <div className="profile-stats">
        <div className="profile-stat">
          <CalendarRange size={18} strokeWidth={1.75} />
          <span className="profile-stat__value">{periods.length}</span>
          <span className="profile-stat__label">período{periods.length !== 1 ? "s" : ""}</span>
        </div>
        <div className="profile-stat">
          <BookOpen size={18} strokeWidth={1.75} />
          <span className="profile-stat__value">{subjects.length}</span>
          <span className="profile-stat__label">matéria{subjects.length !== 1 ? "s" : ""}</span>
        </div>
        <div className="profile-stat">
          <Users size={18} strokeWidth={1.75} />
          <span className="profile-stat__value">{professors.length}</span>
          <span className="profile-stat__label">professor{professors.length !== 1 ? "es" : ""}</span>
        </div>
      </div>

      {!gamificationLoading && (
        <section className="hub-section">
          <div className="hub-section__header">
            <h3>Progresso</h3>
            {premium && <Badge tone="accent">Premium: XP em dobro</Badge>}
          </div>
          <div className="progress-panel">
            <div className="progress-panel__top">
              <span className="progress-panel__level-name">{level.name}</span>
              <span className="progress-panel__xp">
                {xp} XP{level.nextThreshold !== null ? ` · ${level.nextThreshold - xp} para o próximo nível` : ""}
              </span>
            </div>
            <div className="xp-bar">
              <div className="xp-bar__fill" style={{ width: `${level.progressPct}%` }} />
            </div>
            <div className="progress-panel__streak">
              <span className="progress-panel__streak-current" data-active={streak.current > 0}>
                <Flame size={14} strokeWidth={2} />
                {streak.current} {streak.current === 1 ? "dia seguido" : "dias seguidos"}
              </span>
              <span>Recorde: {streak.best} {streak.best === 1 ? "dia" : "dias"}</span>
            </div>
          </div>
        </section>
      )}

      {!gamificationLoading && (
        <section className="hub-section">
          <div className="hub-section__header">
            <h3>Conquistas</h3>
            <Badge tone="muted">{unlockedCount}/{achievements.length}</Badge>
          </div>
          <div className="feature-row-list">
            {achievements.map((achievement) => (
              <FeatureRow
                key={achievement.id}
                icon={achievement.icon}
                title={achievement.title}
                description={achievement.description}
                action={
                  <Badge tone={achievement.unlocked ? "accent" : "muted"}>
                    {achievement.unlocked ? "Desbloqueada" : "Bloqueada"}
                  </Badge>
                }
              />
            ))}
          </div>
        </section>
      )}

      <section className="hub-section">
        <h3>Conta</h3>
        <div className="feature-row-list">
          <FeatureRow
            icon={Lock}
            title="Login e sincronização"
            description="Por enquanto o perfil fica salvo só neste navegador. Autenticação de verdade está planejada."
          />
        </div>
      </section>
    </div>
  );
}
