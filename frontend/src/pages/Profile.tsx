import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Pencil, X, Lock, LogOut, BookOpen, CalendarRange, Users } from "lucide-react";
import { usePageTitle } from "../context/PageTitleContext";
import { usePeriods } from "../context/PeriodContext";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";
import { useEntityList } from "../hooks/useEntityList";
import { useGamification } from "../hooks/useGamification";
import { subjectsApi, professorsApi } from "../api/client";
import { Field } from "../components/ui/Field";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { FeatureRow } from "../components/ui/FeatureRow";
import { ProgressBoard } from "../components/gamification/ProgressBoard";
import { AchievementGrid } from "../components/gamification/AchievementGrid";

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
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { periods } = usePeriods();
  const { items: subjects } = useEntityList(subjectsApi);
  const { items: professors } = useEntityList(professorsApi);
  const { streak, weekActivity, xp, level, achievements, statsLoading: gamificationLoading, premium } = useGamification();
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

  const handleLogout = async () => {
    await logout();
    navigate("/login");
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
          <ProgressBoard streak={streak} weekActivity={weekActivity} xp={xp} level={level} />
        </section>
      )}

      {!gamificationLoading && (
        <section className="hub-section">
          <div className="hub-section__header">
            <h3>Conquistas</h3>
            <Badge tone="muted">{unlockedCount}/{achievements.length}</Badge>
          </div>
          <AchievementGrid achievements={achievements} />
        </section>
      )}

      <section className="hub-section">
        <h3>Conta</h3>
        <div className="feature-row-list">
          <FeatureRow
            icon={Lock}
            title={user?.email ?? ""}
            description="Conta conectada"
            action={
              <Button variant="ghost" icon={LogOut} onClick={handleLogout}>
                Sair
              </Button>
            }
          />
        </div>
      </section>
    </div>
  );
}
