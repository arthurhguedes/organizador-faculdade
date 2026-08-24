import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LogIn } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { ApiError } from "../api/client";
import { Field } from "../components/ui/Field";
import { Button } from "../components/ui/Button";
import { ErrorBanner } from "../components/ui/ErrorBanner";
import { GoogleIcon } from "../components/ui/GoogleIcon";

export function Login() {
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!identifier || !password) return;
    setError(null);
    setSubmitting(true);
    try {
      await login(identifier, password);
      navigate("/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível entrar. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setGoogleLoading(true);
    try {
      await loginWithGoogle();
    } catch {
      setError("Não foi possível entrar com o Google. Tente novamente.");
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
        <h1 className="auth-card__title">Entrar</h1>
        <p className="auth-card__subtitle">Acesse sua conta pra continuar organizando sua vida acadêmica.</p>

        {error && <ErrorBanner message={error} />}

        <button
          type="button"
          className="btn btn--secondary auth-google-btn"
          onClick={handleGoogleLogin}
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
            label="Email ou usuário"
            type="text"
            autoComplete="username"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            required
          />
          <Field
            label="Senha"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <Link to="/esqueci-senha" className="auth-form__forgot-link">
            Esqueci minha senha
          </Link>
          <Button type="submit" variant="primary" icon={LogIn} loading={submitting}>
            {submitting ? "Entrando..." : "Entrar"}
          </Button>
        </form>

        <p className="auth-card__footer">
          Ainda não tem conta? <Link to="/registrar">Criar conta</Link>
        </p>
      </div>
    </div>
  );
}
