import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { authApi, ApiError } from "../api/client";
import { authClient } from "../lib/authClient";
import type { AuthUser } from "../api/types";

// O Better Auth devolve códigos genéricos em inglês — traduzido aqui pra
// manter a mensagem que os ErrorBanner de Login/Register já mostravam.
const ERROR_MESSAGES: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD: "Email ou senha inválidos",
  INVALID_USERNAME_OR_PASSWORD: "Usuário ou senha inválidos",
  USER_ALREADY_EXISTS: "Email já cadastrado",
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: "Email já cadastrado",
  USERNAME_IS_ALREADY_TAKEN: "Esse nome de usuário já está em uso",
  USERNAME_TOO_SHORT: "Nome de usuário muito curto",
  USERNAME_TOO_LONG: "Nome de usuário muito longo",
  INVALID_USERNAME: "Nome de usuário deve ter 3–20 caracteres: letras minúsculas, números ou _",
  INVALID_TOKEN: "Link inválido ou expirado. Solicite um novo.",
  PASSWORD_TOO_SHORT: "A senha precisa ter pelo menos 8 caracteres",
  PASSWORD_TOO_LONG: "Senha muito longa",
};

function authErrorMessage(error: { code?: string; message?: string } | null, fallback: string): string {
  if (!error) return fallback;
  return (error.code && ERROR_MESSAGES[error.code]) || error.message || fallback;
}

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  login: (identifier: string, password: string) => Promise<AuthUser>;
  register: (name: string, email: string, username: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  updateProfile: (body: Parameters<typeof authApi.updateProfile>[0]) => Promise<AuthUser>;
  updateUsername: (username: string) => Promise<AuthUser>;
  requestPasswordReset: (email: string) => Promise<void>;
  resetPassword: (newPassword: string, token: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authApi
      .me()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  // Login aceita email ou nome de usuário no mesmo campo — decide qual
  // endpoint do Better Auth chamar pelo formato do que foi digitado.
  const login = async (identifier: string, password: string) => {
    const { error } = identifier.includes("@")
      ? await authClient.signIn.email({ email: identifier, password })
      : await authClient.signIn.username({ username: identifier, password });
    if (error) throw new ApiError(authErrorMessage(error, "Não foi possível entrar. Tente novamente."));
    const loggedUser = await authApi.me();
    setUser(loggedUser);
    return loggedUser;
  };

  const register = async (name: string, email: string, username: string, password: string) => {
    const { error } = await authClient.signUp.email({ email, password, name, username });
    if (error) throw new ApiError(authErrorMessage(error, "Não foi possível criar sua conta. Tente novamente."));
    const newUser = await authApi.me();
    setUser(newUser);
    return newUser;
  };

  const logout = async () => {
    await authClient.signOut();
    setUser(null);
  };

  // Redireciona pro Google; ao voltar (callbackURL) o AuthProvider recarrega
  // e o useEffect acima busca o perfil normalmente.
  const loginWithGoogle = async () => {
    await authClient.signIn.social({ provider: "google", callbackURL: "/" });
  };

  const updateProfile = async (body: Parameters<typeof authApi.updateProfile>[0]) => {
    const updatedUser = await authApi.updateProfile(body);
    setUser(updatedUser);
    return updatedUser;
  };

  const updateUsername = async (username: string) => {
    const updatedUser = await authApi.updateUsername(username);
    setUser(updatedUser);
    return updatedUser;
  };

  // Better Auth sempre responde com sucesso aqui, exista ou não o email
  // (evita enumeração de contas) — o link em si só existe se o email bater
  // com um usuário real, e hoje vai só pro log do backend (sem provedor de
  // email configurado ainda).
  const requestPasswordReset = async (email: string) => {
    const { error } = await authClient.requestPasswordReset({
      email,
      redirectTo: `${window.location.origin}/redefinir-senha`,
    });
    if (error) throw new ApiError(authErrorMessage(error, "Não foi possível solicitar a redefinição. Tente novamente."));
  };

  const resetPassword = async (newPassword: string, token: string) => {
    const { error } = await authClient.resetPassword({ newPassword, token });
    if (error) throw new ApiError(authErrorMessage(error, "Não foi possível redefinir sua senha. Tente novamente."));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        loginWithGoogle,
        updateProfile,
        updateUsername,
        requestPasswordReset,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth precisa estar dentro de um AuthProvider");
  }
  return ctx;
}
