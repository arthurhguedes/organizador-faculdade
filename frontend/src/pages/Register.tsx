import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { UserPlus } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { ApiError } from "../api/client";
import { Field } from "../components/ui/Field";
import { Button } from "../components/ui/Button";
import { ErrorBanner } from "../components/ui/ErrorBanner";
import { GoogleIcon } from "../components/ui/GoogleIcon";

// Mesmo padrão usado no username do Perfil (frontend/src/pages/Profile.tsx).
const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/;

export function Register() {
  const { register, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const usernameFormatValid = username.length === 0 || USERNAME_PATTERN.test(username);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name || !email || !username || !password) return;
    if (!USERNAME_PATTERN.test(username)) {
      setError("Nome de usuário deve ter 3–20 caracteres: letras minúsculas, números ou _");
      return;
    }
    if (password.length < 8) {
      setError("A senha precisa ter pelo menos 8 caracteres");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await register(name, email, username, password);
      navigate("/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível criar sua conta. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleRegister = async () => {
    setError(null);
    setGoogleLoading(true);
    try {
      await loginWithGoogle();
    } catch {
      setError("Não foi possível continuar com o Google. Tente novamente.");
      setGoogleLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-card__brand">
          <img src="/favicon.svg" alt="" width={34} height={34} />
          <span>Notary</span>
        </div>
        <h1 className="auth-card__title">Criar conta</h1>
        <p className="auth-card__subtitle">Leva menos de um minuto.</p>

        {error && <ErrorBanner message={error} />}

        <button
          type="button"
          className="btn btn--secondary auth-google-btn"
          onClick={handleGoogleRegister}
          disabled={googleLoading || submitting}
        >
          <GoogleIcon />
          {googleLoading ? "Redirecionando..." : "Continuar com Google"}
        </button>

        <div className="auth-divider">
          <span>ou</span>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <Field
            label="Nome"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <Field
            label="Email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <label className="field" htmlFor="field-nome-de-usuario">
            <span className="field__label">Nome de usuário</span>
            <div className={`username-field ${username && !usernameFormatValid ? "username-field--error" : ""}`}>
              <span className="username-field__at">@</span>
              <input
                id="field-nome-de-usuario"
                autoComplete="username"
                placeholder="arthur_g23"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase())}
                required
              />
            </div>
            <span className={`field__hint ${username && !usernameFormatValid ? "field__hint--error" : ""}`}>
              3–20 caracteres: letras minúsculas, números ou _. Vai poder ser usado pra entrar no lugar do email.
            </span>
          </label>
          <Field
            label="Senha"
            type="password"
            autoComplete="new-password"
            hint="Mínimo de 8 caracteres"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <Button type="submit" variant="primary" icon={UserPlus} loading={submitting}>
            {submitting ? "Criando conta..." : "Criar conta"}
          </Button>
        </form>

        <p className="auth-card__footer">
          Já tem conta? <Link to="/login">Entrar</Link>
        </p>
      </div>
    </div>
  );
}
