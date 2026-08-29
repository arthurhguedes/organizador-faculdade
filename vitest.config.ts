import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Sem isso o vitest da raiz varre o projeto inteiro e acaba rodando também
    // os testes de `frontend/src/lib/*.test.ts` (que dependem das dependências
    // instaladas em `frontend/node_modules`). No CI, o job do back-end instala
    // só as dependências da raiz, então esses arquivos quebrariam o job.
    // Cada lado roda o próprio `npm test`: raiz = back-end, frontend = parsers.
    include: ["src/**/*.test.ts"],
  },
});
