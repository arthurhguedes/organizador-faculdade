import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Send } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { ApiError } from "../api/client";
import { Field } from "../components/ui/Field";
import { Button } from "../components/ui/Button";
import { ErrorBanner } from "../components/ui/ErrorBanner";

export function ForgotPassword() {
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setError(null);
    setSubmitting(true);
    try {
      await requestPasswordReset(email);
      setSent(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível solicitar a redefinição. Tente novamente.");
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
        <h1 className="auth-card__title">Esqueci minha senha</h1>
        <p className="auth-card__subtitle">Informe o email da sua conta pra gerar um link de redefinição.</p>

        {error && <ErrorBanner message={error} />}
        {sent && (
          <ErrorBanner
            tone="info"
            message="Se esse email existir, um link de redefinição foi gerado. Como o envio de email ainda não está configurado, ele aparece no log do servidor por enquanto."
          />
        )}

        {!sent && (
          <form className="auth-form" onSubmit={handleSubmit}>
            <Field
              label="Email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Button type="submit" variant="primary" icon={Send} loading={submitting}>
              {submitting ? "Enviando..." : "Enviar link"}
            </Button>
          </form>
        )}

        <p className="auth-card__footer">
          Lembrou a senha? <Link to="/login">Entrar</Link>
        </p>
      </div>
    </div>
  );
}
