import { createAuthClient } from "better-auth/react";
import { usernameClient } from "better-auth/client/plugins";

// Ver frontend/src/api/client.ts sobre o motivo de usar caminho relativo em produção.
const API_URL = import.meta.env.VITE_API_URL ?? (import.meta.env.PROD ? "" : "http://localhost:3000");

export const authClient = createAuthClient({
  baseURL: API_URL,
  plugins: [usernameClient()],
});
