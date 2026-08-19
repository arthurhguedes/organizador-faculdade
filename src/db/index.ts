import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import dotenv from "dotenv";
import * as schema from "./schema.js";

dotenv.config({ quiet: true });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// O Neon fecha conexões ociosas periodicamente. Sem esse listener, esse erro
// de conexão vira uma exceção não tratada e derruba o processo Node inteiro;
// sob `tsx watch` ele não reinicia sozinho, então o back-end fica fora do ar
// até a próxima alteração de arquivo (é a causa do login "quebrar do nada").
pool.on("error", (err) => {
  console.error("Erro na pool do Postgres:", err);
});

export const db = drizzle(pool, { schema });
