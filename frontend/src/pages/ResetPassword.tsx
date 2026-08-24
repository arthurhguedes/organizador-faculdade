import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { KeyRound } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { ApiError } from "../api/client";
import { Field } from "../components/ui/Field";
import { Button } from "../components/ui/Button";
import { ErrorBanner } from "../components/ui/ErrorBanner";

export function ResetPassword() {
  const { resetPassword } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (password.length < 8) {
      setError("A senha precisa ter pelo menos 8 caracteres");
      return;
    }
    if (password !== confirmPassword) {
      setError("As senhas não coincidem");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await resetPassword(password, token);
      navigate("/login");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível redefinir sua senha. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-card__brand">
          <img src="/favicon.svg" alt="" width={34} height={34} />
          <span>Notary</span>
        </div>
        <h1 className="auth-card__title">Redefinir senha</h1>
        <p className="auth-card__subtitle">Escolha uma nova senha pra sua conta.</p>

        {!token && <ErrorBanner message="Link inválido ou incompleto. Solicite um novo." />}
        {token && error && <ErrorBanner message={error} />}

        {token && (
          <form className="auth-form" onSubmit={handleSubmit}>
            <Field
              label="Nova senha"
              type="password"
              autoComplete="new-password"
              hint="Mínimo de 8 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <Field
              label="Confirmar nova senha"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
            <Button type="submit" variant="primary" icon={KeyRound} loading={submitting}>
              {submitting ? "Redefinindo..." : "Redefinir senha"}
            </Button>
          </form>
        )}

        <p className="auth-card__footer">
          {token ? (
            <>
              Lembrou a senha? <Link to="/login">Entrar</Link>
            </>
          ) : (
            <Link to="/esqueci-senha">Solicitar novo link</Link>
          )}
        </p>
      </div>
    </div>
  );
}
