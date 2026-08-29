import { useEffect, useState, type ChangeEvent, type ComponentType, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  AtSign,
  BookOpen,
  CalendarRange,
  Camera,
  IdCard,
  Link2,
  Lock,
  LogOut,
  ShieldCheck,
  Users,
} from "lucide-react";
import { usePageTitle } from "../context/PageTitleContext";
import { usePeriods } from "../context/PeriodContext";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";
import { useEntityList } from "../hooks/useEntityList";
import { subjectsApi, professorsApi, ApiError } from "../api/client";
import type { AuthUser } from "../api/types";
import { resizeImageToDataUrl } from "../lib/avatarImage";
import { ALL_INSTITUTIONS, INSTITUTION_GROUPS, OTHER_INSTITUTION_VALUE } from "../lib/institutions";
import { Field } from "../components/ui/Field";
import { PageHeader } from "../components/ui/PageHeader";
import { Button } from "../components/ui/Button";
import { GithubIcon, InstagramIcon, LinkedinIcon, XIcon } from "../components/ui/SocialIcons";

type ProfileTab = "overview" | "personal" | "social" | "account";

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

const TABS: Array<{ key: ProfileTab; label: string; Icon: ComponentType<{ size?: number; strokeWidth?: number }> }> = [
  { key: "overview", label: "Visão geral", Icon: IdCard },
  { key: "personal", label: "Dados pessoais", Icon: Camera },
  { key: "social", label: "Redes sociais", Icon: Link2 },
  { key: "account", label: "Conta", Icon: Lock },
];

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

// O que conta como "perfil preenchido". Cada item aponta pra aba que resolve
// aquele campo, então o chip vira um atalho em vez de só um aviso do que falta.
const COMPLETION_ITEMS: Array<{
  key: string;
  label: string;
  tab: ProfileTab;
  isFilled: (user: AuthUser) => boolean;
}> = [
  { key: "avatar", label: "Foto de perfil", tab: "personal", isFilled: (u) => Boolean(u.avatarImage) },
  { key: "course", label: "Curso", tab: "personal", isFilled: (u) => Boolean(u.course) },
  { key: "institution", label: "Instituição", tab: "personal", isFilled: (u) => Boolean(u.institution) },
  { key: "birthDate", label: "Data de nascimento", tab: "personal", isFilled: (u) => Boolean(u.birthDate) },
  { key: "username", label: "Nome de usuário", tab: "account", isFilled: (u) => Boolean(u.username) },
  {
    key: "social",
    label: "Redes sociais",
    tab: "social",
    isFilled: (u) => Boolean(u.linkedinUrl || u.githubUrl || u.instagramUrl || u.xUrl),
  },
];

function calculateAge(birthDate: string): number {
  // "T00:00:00" força meia-noite local: sem isso o JS lê "YYYY-MM-DD" como
  // UTC e os getters locais devolvem o dia anterior em fuso negativo (Brasil),
  // fazendo a idade virar um dia antes do aniversário de verdade.
  const birth = new Date(`${birthDate}T00:00:00`);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const hasNotHadBirthdayThisYear =
    now.getMonth() < birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate());
  if (hasNotHadBirthdayThisYear) age -= 1;
  return age;
}

const EMPTY_PERSONAL: PersonalDraft = { name: "", institution: "", course: "", birthDate: "", avatarImage: null };
const EMPTY_SOCIAL: SocialDraft = { linkedinUrl: "", githubUrl: "", instagramUrl: "", xUrl: "" };

export function Profile() {
  usePageTitle("Perfil");
  const { notify } = useToast();
  const { user, logout, updateProfile, updateUsername } = useAuth();
  const navigate = useNavigate();
  const { periods } = usePeriods();
  const { items: subjects } = useEntityList(subjectsApi);
  const { items: professors } = useEntityList(professorsApi);

  const [activeTab, setActiveTab] = useState<ProfileTab>("overview");
  const [saving, setSaving] = useState(false);
  const [personalDraft, setPersonalDraft] = useState<PersonalDraft>(EMPTY_PERSONAL);
  const [socialDraft, setSocialDraft] = useState<SocialDraft>(EMPTY_SOCIAL);
  const [usernameDraft, setUsernameDraft] = useState("");
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [customInstitution, setCustomInstitution] = useState(false);
  const [seeded, setSeeded] = useState(false);

  const syncDrafts = (from: AuthUser) => {
    setPersonalDraft({
      name: from.name ?? "",
      institution: from.institution ?? "",
      course: from.course ?? "",
      birthDate: from.birthDate ?? "",
      avatarImage: from.avatarImage ?? null,
    });
    setSocialDraft({
      linkedinUrl: from.linkedinUrl ?? "",
      githubUrl: from.githubUrl ?? "",
      instagramUrl: from.instagramUrl ?? "",
      xUrl: from.xUrl ?? "",
    });
    setUsernameDraft(from.username ?? "");
    setUsernameError(null);
    setCustomInstitution(Boolean(from.institution) && !ALL_INSTITUTIONS.includes(from.institution ?? ""));
  };

  // Os campos agora vivem nas abas, não num painel que abre e fecha — então o
  // rascunho é semeado uma vez, quando o usuário chega do AuthContext.
  useEffect(() => {
    if (!user || seeded) return;
    syncDrafts(user);
    setSeeded(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, seeded]);

  // Trocar de aba descarta edição não salva daquela aba de propósito: cada aba
  // tem o próprio "Salvar", e carregar rascunho velho de volta seria pior.
  const goToTab = (tab: ProfileTab) => {
    if (user) syncDrafts(user);
    setActiveTab(tab);
  };

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

  const filledItems = user ? COMPLETION_ITEMS.filter((item) => item.isFilled(user)) : [];
  const missingItems = user ? COMPLETION_ITEMS.filter((item) => !item.isFilled(user)) : [];
  const completionPercent = Math.round((filledItems.length / COMPLETION_ITEMS.length) * 100);

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
      <PageHeader title="Perfil" description="Seus dados, suas redes e o resumo do que já está cadastrado no Notary." />

      <div className="profile-tabs" role="tablist" aria-label="Seções do perfil">
        {TABS.map(({ key, label, Icon }) => (
          <button
            key={key}
            type="button"
            role="tab"
            id={`profile-tab-${key}`}
            aria-selected={activeTab === key}
            aria-controls={`profile-panel-${key}`}
            className={`profile-tabs__tab${activeTab === key ? " profile-tabs__tab--active" : ""}`}
            onClick={() => goToTab(key)}
          >
            <Icon size={15} strokeWidth={1.75} />
            {label}
          </button>
        ))}
      </div>

      <div
        className="profile-page__main"
        role="tabpanel"
        id={`profile-panel-${activeTab}`}
        aria-labelledby={`profile-tab-${activeTab}`}
      >
        {activeTab === "overview" && (
          <>
            <section className="profile-identity">
              <div className="profile-identity__head">
                <div className="profile-avatar profile-avatar--lg">
                  {user?.avatarImage ? <img src={user.avatarImage} alt="" /> : initials}
                </div>
                <div className="profile-identity__title">
                  <h3 className="profile-identity__name">{user?.name || "Sem nome"}</h3>
                  {user?.username ? (
                    <span className="profile-identity__handle">@{user.username}</span>
                  ) : (
                    <button
                      type="button"
                      className="profile-identity__handle profile-identity__handle--empty"
                      onClick={() => goToTab("account")}
                    >
                      definir nome de usuário
                    </button>
                  )}
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
              </div>

              {/* Ficha em vez da linha corrida "curso · instituição · idade": cada
                  campo mantém o próprio rótulo, então um campo vazio aparece como
                  lacuna nomeada em vez de simplesmente sumir do texto. */}
              <dl className="profile-facts">
                <div className="profile-fact">
                  <dt>Curso</dt>
                  <dd data-empty={!user?.course}>{user?.course || "Não informado"}</dd>
                </div>
                <div className="profile-fact">
                  <dt>Instituição</dt>
                  <dd data-empty={!user?.institution}>{user?.institution || "Não informada"}</dd>
                </div>
                <div className="profile-fact">
                  <dt>Idade</dt>
                  <dd data-empty={age === null}>{age !== null ? `${age} anos` : "Não informada"}</dd>
                </div>
              </dl>
            </section>

            {missingItems.length > 0 && (
              <section className="profile-completion">
                <div className="profile-completion__header">
                  <h3>Complete seu perfil</h3>
                  <span className="profile-completion__value">{completionPercent}%</span>
                </div>
                <div className="profile-completion__bar">
                  <div
                    className="profile-completion__bar-fill"
                    style={{ transform: `scaleX(${filledItems.length / COMPLETION_ITEMS.length})` }}
                  />
                </div>
                <p className="profile-completion__hint">
                  {missingItems.length === 1 ? "Falta 1 item:" : `Faltam ${missingItems.length} itens:`}
                </p>
                <div className="profile-completion__chips">
                  {missingItems.map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      className="profile-completion__chip"
                      onClick={() => goToTab(item.tab)}
                    >
                      {item.label}
                      <ArrowRight size={13} strokeWidth={2} />
                    </button>
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        {activeTab === "personal" && (
          <form className="profile-panel" onSubmit={handleSavePersonal}>
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

            <div className="profile-panel__actions">
              <Button type="submit" variant="primary" loading={saving} loadingText="Salvando...">
                Salvar dados pessoais
              </Button>
            </div>
          </form>
        )}

        {activeTab === "social" && (
          <form className="profile-panel" onSubmit={handleSaveSocial}>
            <p className="profile-panel__hint">
              Os links preenchidos aparecem na aba Visão geral, ao lado do seu nome.
            </p>
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
            <div className="profile-panel__actions">
              <Button type="submit" variant="primary" loading={saving} loadingText="Salvando...">
                Salvar redes sociais
              </Button>
            </div>
          </form>
        )}

        {activeTab === "account" && (
          <>
            <form className="profile-panel" onSubmit={handleSaveUsername}>
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
                <span
                  className={`field__hint ${usernameError || (usernameDraft && !usernameFormatValid) ? "field__hint--error" : ""}`}
                >
                  {usernameError ??
                    (usernameDraft && !usernameFormatValid
                      ? "3–20 caracteres: letras minúsculas, números ou _"
                      : "3–20 caracteres: letras minúsculas, números ou _. Também serve pra entrar no lugar do email.")}
                </span>
              </label>
              <div className="profile-panel__actions">
                <Button
                  type="submit"
                  variant="primary"
                  loading={saving}
                  loadingText="Salvando..."
                  disabled={!usernameDraft || !usernameFormatValid || usernameDraft === user?.username}
                >
                  Salvar nome de usuário
                </Button>
              </div>
            </form>

            <section className="profile-panel">
              <div className="profile-account-row">
                <span className="profile-account-row__icon">
                  <AtSign size={18} strokeWidth={1.75} />
                </span>
                <div className="profile-account-row__text">
                  <p className="profile-account-row__title">{user?.email}</p>
                  <p className="profile-account-row__description">Email de acesso</p>
                </div>
              </div>
              <div className="profile-account-row">
                <span className="profile-account-row__icon">
                  <ShieldCheck size={18} strokeWidth={1.75} />
                </span>
                <div className="profile-account-row__text">
                  <p className="profile-account-row__title">Sessão ativa neste dispositivo</p>
                  <p className="profile-account-row__description">Sair encerra a sessão e volta pra tela de login</p>
                </div>
                <Button variant="danger" icon={LogOut} onClick={handleLogout}>
                  Sair
                </Button>
              </div>
            </section>
          </>
        )}
      </div>

      <aside className="profile-page__side">
        <section className="hub-section">
          <h3>Resumo</h3>
          <div className="profile-figures">
            <div className="profile-figure">
              <CalendarRange size={16} strokeWidth={1.75} />
              <span className="profile-figure__label">período{periods.length !== 1 ? "s" : ""}</span>
              <span className="profile-figure__value">{periods.length}</span>
            </div>
            <div className="profile-figure">
              <BookOpen size={16} strokeWidth={1.75} />
              <span className="profile-figure__label">matéria{subjects.length !== 1 ? "s" : ""}</span>
              <span className="profile-figure__value">{subjects.length}</span>
            </div>
            <div className="profile-figure">
              <Users size={16} strokeWidth={1.75} />
              <span className="profile-figure__label">professor{professors.length !== 1 ? "es" : ""}</span>
              <span className="profile-figure__value">{professors.length}</span>
            </div>
          </div>
        </section>

        {activeTab !== "overview" && missingItems.length > 0 && (
          <section className="hub-section">
            <h3>Falta preencher</h3>
            <div className="profile-completion__chips">
              {missingItems.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  className="profile-completion__chip"
                  onClick={() => goToTab(item.tab)}
                >
                  {item.label}
                  <ArrowRight size={13} strokeWidth={2} />
                </button>
              ))}
            </div>
          </section>
        )}
      </aside>
    </div>
  );
}
