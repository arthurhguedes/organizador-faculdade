import { app } from "./app.js";

// Sem isso, qualquer exceção não tratada (em qualquer lugar do processo, não
// só nas rotas) mata o Node inteiro; sob `tsx watch` ele não reinicia sozinho
// depois disso, então o back-end fica fora do ar em silêncio até a próxima
// alteração de arquivo — é a causa recorrente do login "quebrar do nada".
process.on("uncaughtException", (err) => {
  console.error("Exceção não tratada:", err);
});
process.on("unhandledRejection", (err) => {
  console.error("Promise rejeitada sem tratamento:", err);
});

// Hosts como Railway/Render injetam a porta via env var; 3000 é só o fallback local.
const port = process.env.PORT ? Number(process.env.PORT) : 3000;

app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});
