import { useState, type FormEvent } from "react";
import { UserRound, Lock } from "lucide-react";
import { usePageTitle } from "../context/PageTitleContext";
import { useToast } from "../context/ToastContext";
import { Field } from "../components/ui/Field";
import { Button } from "../components/ui/Button";

const STORAGE_KEY = "organizador:profile";

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
  const [profile, setProfile] = useState<LocalProfile>(loadProfile);

  const initials = profile.name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "?";

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    notify("Perfil salvo", "success");
  };

  return (
    <div className="profile-page">
      <div className="profile-card">
        <div className="profile-avatar">{initials}</div>
        <div>
          <p className="profile-card__name">{profile.name || "Sem nome"}</p>
          <p className="profile-card__course">{profile.course || "Curso não informado"}</p>
        </div>
      </div>

      <form className="inline-form inline-form--stack" onSubmit={handleSubmit}>
        <Field
          label="Nome"
          value={profile.name}
          onChange={(e) => setProfile({ ...profile, name: e.target.value })}
        />
        <Field
          label="Curso"
          value={profile.course}
          onChange={(e) => setProfile({ ...profile, course: e.target.value })}
        />
        <Button type="submit" variant="primary" icon={UserRound}>
          Salvar perfil
        </Button>
      </form>

      <div className="coming-soon coming-soon--inline">
        <div className="coming-soon__icon">
          <Lock size={20} strokeWidth={1.75} />
        </div>
        <div>
          <h3>Login e sincronização</h3>
          <p>Por enquanto o perfil fica salvo só neste navegador. Autenticação de verdade está planejada.</p>
        </div>
        <span className="badge badge--muted">Em breve</span>
      </div>
    </div>
  );
}
