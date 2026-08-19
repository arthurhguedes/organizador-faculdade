import { createAuthClient } from "better-auth/react";
import { usernameClient } from "better-auth/client/plugins";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export const authClient = createAuthClient({
  baseURL: API_URL,
  plugins: [usernameClient()],
});
