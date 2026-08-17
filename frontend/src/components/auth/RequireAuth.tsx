import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Landing } from "../../pages/Landing";

export function RequireAuth() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="auth-loading">Carregando…</div>;
  }

  if (!user) {
    // "/" é a home pública (Landing) quando deslogado — as outras rotas
    // protegidas continuam mandando pro login normalmente.
    if (location.pathname === "/") {
      return <Landing />;
    }
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
