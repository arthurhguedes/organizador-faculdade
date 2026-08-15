import type { Request, Response, NextFunction } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "../auth.js";

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
  if (!session) {
    return res.status(401).json({ message: "Não autenticado" });
  }

  // O tipo do Better Auth declara `id: string` (assume nanoid), mas com
  // `generateId: false` o valor real em runtime é o serial do Postgres.
  req.userId = session.user.id as unknown as number;
  next();
}
