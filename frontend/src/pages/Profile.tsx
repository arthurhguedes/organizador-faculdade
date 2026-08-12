import { useState, type ChangeEvent, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Pencil, X, Lock, LogOut, BookOpen, CalendarRange, Users } from "lucide-react";
import { usePageTitle } from "../context/PageTitleContext";
import { usePeriods } from "../context/PeriodContext";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";
import { useEntityList } from "../hooks/useEntityList";
import { useGamification } from "../hooks/useGamification";
import { subjectsApi, professorsApi, ApiError } from "../api/client";
import { resizeImageToDataUrl } from "../lib/avatarImage";
import { Field } from "../components/ui/Field";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { FeatureRow } from "../components/ui/FeatureRow";
import { ProgressBoard } from "../components/gamification/ProgressBoard";
import { AchievementGrid } from "../components/gamification/AchievementGrid";

type ProfileSection = "personal" | "social" | "username";

type PersonalDraft = {
  name: string;
  institution: string;
  course: string;
  birthDate: string;
  avatarImage: string | null;
};

type SocialDraft = {
  linkedinUrl: string;
  githubUrl: string;
  instagramUrl: string;
  xUrl: string;
};

function calculateAge(birthDate: string): number {
  const birth = new Date(birthDate);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const hasNotHadBirthdayThisYear =
    now.getMonth() < birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate());
  if (hasNotHadBirthdayThisYear) age -= 1;
  return age;
}

export function Profile() {
  usePageTitle("Perfil");
  const { notify } = useToast();
  const { user, logout, updateProfile, updateUsername } = useAuth();
  const navigate = useNavigate();
  const { periods } = usePeriods();
  const { items: subjects } = useEntityList(subjectsApi);
  const { items: professors } = useEntityList(professorsApi);
  const { streak, weekActivity, xp, level, achievements, statsLoading: gamificationLoading, premium } = useGamification();
  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  const [editing, setEditing] = useState(false);
  const [activeSection, setActiveSection] = useState<ProfileSection>("personal");
  const [saving, setSaving] = useState(false);

  const [personalDraft, setPersonalDraft] = useState<PersonalDraft>({
    name: "",
    institution: "",
    course: "",
    birthDate: "",
    avatarImage: null,
  });
  const [socialDraft, setSocialDraft] = useState<SocialDraft>({
    linkedinUrl: "",
    githubUrl: "",
    instagramUrl: "",
    xUrl: "",
  });
  const [usernameDraft, setUsernameDraft] = useState("");
  const [usernameError, setUsernameError] = useState<string | null>(null);

  const initials =
    (user?.name ?? "")
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "?";

  const age = user?.birthDate ? calculateAge(user.birthDate) : null;

  const startEditing = () => {
    setPersonalDraft({
      name: user?.name ?? "",
      institution: user?.institution ?? "",
      course: user?.course ?? "",
      birthDate: user?.birthDate ?? "",
      avatarImage: user?.avatarImage ?? null,
    });
    setSocialDraft({
      linkedinUrl: user?.linkedinUrl ?? "",
      githubUrl: user?.githubUrl ?? "",
      instagramUrl: user?.instagramUrl ?? "",
      xUrl: user?.xUrl ?? "",
    });
    setUsernameDraft(user?.username ?? "");
    setUsernameError(null);
    setActiveSection("personal");
    setEditing(true);
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const handleAvatarChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await resizeImageToDataUrl(file);
      setPersonalDraft((prev) => ({ ...prev, avatarImage: dataUrl }));
    } catch {
      notify("Não foi possível processar essa imagem", "error");
    } finally {
      e.target.value = "";
    }
  };

  const handleSavePersonal = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateProfile({
        name: personalDraft.name,
        institution: personalDraft.institution,
        course: personalDraft.course,
        birthDate: personalDraft.birthDate || null,
        avatarImage: personalDraft.avatarImage,
      });
      notify("Dados pessoais salvos", "success");
    } catch (err) {
      notify(err instanceof ApiError ? err.message : "Erro ao salvar dados pessoais", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSocial = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateProfile({ ...socialDraft });
      notify("Redes sociais salvas", "success");
    } catch (err) {
      notify(err instanceof ApiError ? err.message : "Erro ao salvar redes sociais", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveUsername = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setUsernameError(null);
    try {
      await updateUsername(usernameDraft);
      notify("Nome de usuário salvo", "success");
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Erro ao salvar nome de usuário";
      setUsernameError(message);
      notify(message, "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="profile-page">
      {editing ? (
        <div className="profile-edit-panel">
          <div className="profile-edit-tabs">
            <button
              type="button"
              className={activeSection === "personal" ? "is-active" : ""}
              onClick={() => setActiveSection("personal")}
            >
              Dados pessoais
            </button>
            <button
              type="button"
              className={activeSection === "social" ? "is-active" : ""}
              onClick={() => setActiveSection("social")}
            >
              Redes sociais
            </button>
            <button
              type="button"
              className={activeSection === "username" ? "is-active" : ""}
              onClick={() => setActiveSection("username")}
            >
              Nome de usuário
            </button>
          </div>

          {activeSection === "personal" && (
            <form className="inline-form inline-form--stack" onSubmit={handleSavePersonal}>
              <label className="field">
                <span className="field__label">Foto de perfil</span>
                <div className="profile-avatar-picker">
                  <div className="profile-avatar">
                    {personalDraft.avatarImage ? <img src={personalDraft.avatarImage} alt="" /> : initials}
                  </div>
                  <input type="file" accept="image/*" onChange={handleAvatarChange} />
                </div>
              </label>
              <Field
                label="Nome completo"
                value={personalDraft.name}
                onChange={(e) => setPersonalDraft({ ...personalDraft, name: e.target.value })}
              />
              <Field
                label="Instituição de ensino"
                value={personalDraft.institution}
                onChange={(e) => setPersonalDraft({ ...personalDraft, institution: e.target.value })}
              />
              <Field
                label="Curso"
                value={personalDraft.course}
                onChange={(e) => setPersonalDraft({ ...personalDraft, course: e.target.value })}
              />
              <Field
                label="Data de nascimento"
                type="date"
                value={personalDraft.birthDate}
                onChange={(e) => setPersonalDraft({ ...personalDraft, birthDate: e.target.value })}
              />
              <div className="profile-edit-actions">
                <Button type="submit" variant="primary" loading={saving} loadingText="Salvando...">
                  Salvar
                </Button>
                <Button type="button" variant="ghost" icon={X} onClick={() => setEditing(false)}>
                  Cancelar
                </Button>
              </div>
            </form>
          )}

          {activeSection === "social" && (
            <form className="inline-form inline-form--stack" onSubmit={handleSaveSocial}>
              <Field
                label="LinkedIn"
                placeholder="https://linkedin.com/in/..."
                value={socialDraft.linkedinUrl}
                onChange={(e) => setSocialDraft({ ...socialDraft, linkedinUrl: e.target.value })}
              />
              <Field
                label="GitHub"
                placeholder="https://github.com/..."
                value={socialDraft.githubUrl}
                onChange={(e) => setSocialDraft({ ...socialDraft, githubUrl: e.target.value })}
              />
              <Field
                label="Instagram"
                placeholder="https://instagram.com/..."
                value={socialDraft.instagramUrl}
                onChange={(e) => setSocialDraft({ ...socialDraft, instagramUrl: e.target.value })}
              />
              <Field
                label="X (Twitter)"
                placeholder="https://x.com/..."
                value={socialDraft.xUrl}
                onChange={(e) => setSocialDraft({ ...socialDraft, xUrl: e.target.value })}
              />
              <div className="profile-edit-actions">
                <Button type="submit" variant="primary" loading={saving} loadingText="Salvando...">
                  Salvar
                </Button>
                <Button type="button" variant="ghost" icon={X} onClick={() => setEditing(false)}>
                  Cancelar
                </Button>
              </div>
            </form>
          )}

          {activeSection === "username" && (
            <form className="inline-form inline-form--stack" onSubmit={handleSaveUsername}>
              <Field
                label="Nome de usuário"
                placeholder="ex: arthur_g23"
                value={usernameDraft}
                onChange={(e) => {
                  setUsernameDraft(e.target.value);
                  setUsernameError(null);
                }}
                hint={usernameError ?? "3–20 caracteres: letras minúsculas, números ou _. Usado no futuro sistema de ranking e amizades."}
              />
              <div className="profile-edit-actions">
                <Button type="submit" variant="primary" loading={saving} loadingText="Salvando...">
                  Salvar
                </Button>
                <Button type="button" variant="ghost" icon={X} onClick={() => setEditing(false)}>
                  Cancelar
                </Button>
              </div>
            </form>
          )}
        </div>
      ) : (
        <div className="profile-card">
          <div className="profile-avatar">
            {user?.avatarImage ? <img src={user.avatarImage} alt="" /> : initials}
          </div>
          <div className="profile-card__info">
            <p className="profile-card__name">{user?.name || "Sem nome"}</p>
            <p className="profile-card__course">
              {user?.course || "Curso não informado"}
              {user?.institution ? ` · ${user.institution}` : ""}
              {age !== null ? ` · ${age} anos` : ""}
            </p>
            {user?.username && <p className="profile-card__username">@{user.username}</p>}
          </div>
          <Button variant="ghost" icon={Pencil} onClick={startEditing}>
            Editar perfil
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
