import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { authApi } from "../api/client";
import type { AuthUser } from "../api/types";

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (name: string, email: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  updatePlan: (body: { plan: "free" | "premium"; billingCycle?: "monthly" | "yearly" }) => Promise<AuthUser>;
  updateProfile: (body: Parameters<typeof authApi.updateProfile>[0]) => Promise<AuthUser>;
  updateUsername: (username: string) => Promise<AuthUser>;
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

  const login = async (email: string, password: string) => {
    const loggedUser = await authApi.login({ email, password });
    setUser(loggedUser);
    return loggedUser;
  };

  const register = async (name: string, email: string, password: string) => {
    const newUser = await authApi.register({ name, email, password });
    setUser(newUser);
    return newUser;
  };

  const logout = async () => {
    await authApi.logout();
    setUser(null);
  };

  const updatePlan = async (body: { plan: "free" | "premium"; billingCycle?: "monthly" | "yearly" }) => {
    const updatedUser = await authApi.updatePlan(body);
    setUser(updatedUser);
    return updatedUser;
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

  return (
    <AuthContext.Provider
      value={{ user, loading, login, register, logout, updatePlan, updateProfile, updateUsername }}
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
