import { useState, type ChangeEvent, type ComponentType, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Pencil, X, Lock, LogOut, BookOpen, CalendarRange, Users, Camera } from "lucide-react";
import { usePageTitle } from "../context/PageTitleContext";
import { usePeriods } from "../context/PeriodContext";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";
import { useEntityList } from "../hooks/useEntityList";
import { subjectsApi, professorsApi, ApiError } from "../api/client";
import { resizeImageToDataUrl } from "../lib/avatarImage";
import { ALL_INSTITUTIONS, INSTITUTION_GROUPS, OTHER_INSTITUTION_VALUE } from "../lib/institutions";
import { Field } from "../components/ui/Field";
import { Button } from "../components/ui/Button";
import { FeatureRow } from "../components/ui/FeatureRow";
import { GithubIcon, InstagramIcon, LinkedinIcon, XIcon } from "../components/ui/SocialIcons";

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

const SOCIAL_FIELDS: Array<{
  key: keyof SocialDraft;
  label: string;
  placeholder: string;
  Icon: ComponentType<{ size?: number }>;
}> = [
  { key: "linkedinUrl", label: "LinkedIn", placeholder: "https://linkedin.com/in/...", Icon: LinkedinIcon },
  { key: "githubUrl", label: "GitHub", placeholder: "https://github.com/...", Icon: GithubIcon },
  { key: "instagramUrl", label: "Instagram", placeholder: "https://instagram.com/...", Icon: InstagramIcon },
  { key: "xUrl", label: "X (Twitter)", placeholder: "https://x.com/...", Icon: XIcon },
];

const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/;

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
  const [customInstitution, setCustomInstitution] = useState(false);

  const initials =
    (user?.name ?? "")
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "?";

  const age = user?.birthDate ? calculateAge(user.birthDate) : null;
  const usernameFormatValid = usernameDraft.length === 0 || USERNAME_PATTERN.test(usernameDraft);
  const socialLinks = SOCIAL_FIELDS.map((field) => ({ ...field, url: user?.[field.key] })).filter(
    (field): field is (typeof SOCIAL_FIELDS)[number] & { url: string } => Boolean(field.url),
  );

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
    setCustomInstitution(Boolean(user?.institution) && !ALL_INSTITUTIONS.includes(user?.institution ?? ""));
    setActiveSection("personal");
    setEditing(true);
  };

  const handleInstitutionSelect = (e: ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value === OTHER_INSTITUTION_VALUE) {
      setCustomInstitution(true);
      setPersonalDraft((prev) => ({ ...prev, institution: "" }));
    } else {
      setCustomInstitution(false);
      setPersonalDraft((prev) => ({ ...prev, institution: value }));
    }
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
            <form className="inline-form inline-form--stack profile-personal-form" onSubmit={handleSavePersonal}>
              <div className="profile-avatar-picker">
                <label className="profile-avatar profile-avatar--editable">
                  {personalDraft.avatarImage ? <img src={personalDraft.avatarImage} alt="" /> : initials}
                  <span className="profile-avatar__overlay">
                    <Camera size={18} strokeWidth={1.75} />
                  </span>
                  <input type="file" accept="image/*" className="sr-only" onChange={handleAvatarChange} />
                </label>
                <div className="profile-avatar-picker__text">
                  <span className="field__label">Foto de perfil</span>
                  <span className="field__hint">Clique na imagem pra trocar</span>
                </div>
              </div>

              <div className="profile-form-grid">
                <Field
                  label="Nome completo"
                  value={personalDraft.name}
                  onChange={(e) => setPersonalDraft({ ...personalDraft, name: e.target.value })}
                />
                <Field
                  label="Data de nascimento"
                  type="date"
                  value={personalDraft.birthDate}
                  onChange={(e) => setPersonalDraft({ ...personalDraft, birthDate: e.target.value })}
                />
              </div>

              <div className="profile-form-grid">
                <label className="field">
                  <span className="field__label">Instituição de ensino</span>
                  <select
                    className="field__input"
                    value={customInstitution ? OTHER_INSTITUTION_VALUE : personalDraft.institution}
                    onChange={handleInstitutionSelect}
                  >
                    <option value="">Selecione sua instituição</option>
                    {INSTITUTION_GROUPS.map((group) => (
                      <optgroup key={group.label} label={group.label}>
                        {group.options.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                    <option value={OTHER_INSTITUTION_VALUE}>Outra instituição</option>
                  </select>
                </label>
                <Field
                  label="Curso"
                  value={personalDraft.course}
                  onChange={(e) => setPersonalDraft({ ...personalDraft, course: e.target.value })}
                />
              </div>

              {customInstitution && (
                <Field
                  label="Nome da instituição"
                  placeholder="Digite o nome da sua instituição"
                  value={personalDraft.institution}
                  onChange={(e) => setPersonalDraft({ ...personalDraft, institution: e.target.value })}
                />
              )}

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
            <form className="inline-form inline-form--stack profile-personal-form" onSubmit={handleSaveSocial}>
              <div className="profile-form-grid">
                {SOCIAL_FIELDS.map(({ key, label, placeholder, Icon }) => (
                  <label className="field" key={key}>
                    <span className="field__label">{label}</span>
                    <div className="social-field">
                      <span className="social-field__icon">
                        <Icon size={16} />
                      </span>
                      <input
                        type="url"
                        placeholder={placeholder}
                        value={socialDraft[key]}
                        onChange={(e) => setSocialDraft({ ...socialDraft, [key]: e.target.value })}
                      />
                    </div>
                  </label>
                ))}
              </div>
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
              {user?.username && (
                <p className="profile-username-current">
                  Atual: <strong>@{user.username}</strong>
                </p>
              )}
              <label className="field">
                <span className="field__label">Nome de usuário</span>
                <div className={`username-field ${usernameDraft && !usernameFormatValid ? "username-field--error" : ""}`}>
                  <span className="username-field__at">@</span>
                  <input
                    placeholder="arthur_g23"
                    value={usernameDraft}
                    onChange={(e) => {
                      setUsernameDraft(e.target.value.toLowerCase());
                      setUsernameError(null);
                    }}
                  />
                </div>
                <span className={`field__hint ${usernameError || (usernameDraft && !usernameFormatValid) ? "field__hint--error" : ""}`}>
                  {usernameError ??
                    (usernameDraft && !usernameFormatValid
                      ? "3–20 caracteres: letras minúsculas, números ou _"
                      : "3–20 caracteres: letras minúsculas, números ou _. Usado no futuro sistema de ranking e amizades.")}
                </span>
              </label>
              <div className="profile-edit-actions">
                <Button
                  type="submit"
                  variant="primary"
                  loading={saving}
                  loadingText="Salvando..."
                  disabled={!usernameDraft || !usernameFormatValid}
                >
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
            {socialLinks.length > 0 && (
              <div className="profile-social-links">
                {socialLinks.map(({ key, label, url, Icon }) => (
                  <a
                    key={key}
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="profile-social-link"
                    title={label}
                    aria-label={label}
                  >
                    <Icon size={16} />
                  </a>
                ))}
              </div>
            )}
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
