<div align="center">

# Notary

**Organize matérias, horários, provas e notas — sem depender do portal capenga da sua faculdade.**

[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)](#stack)
[![React](https://img.shields.io/badge/React_19-149ECA?style=flat&logo=react&logoColor=white)](#stack)
[![Express](https://img.shields.io/badge/Express_5-000000?style=flat&logo=express&logoColor=white)](#stack)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-4169E1?style=flat&logo=postgresql&logoColor=white)](#stack)
[![Drizzle](https://img.shields.io/badge/Drizzle-ORM-C5F74F?style=flat&logo=drizzle&logoColor=black)](#stack)
[![Better Auth](https://img.shields.io/badge/Auth-Better_Auth-black?style=flat)](#stack)

</div>

<br>

<p align="center">
  <img src="docs/screenshots/landing.png" alt="Página inicial do Notary" width="100%">
</p>

## O que é

A maioria dos portais de faculdade é uma bagunça: notas em uma aba, horário em outra, PDF de matrícula pra conferir turma, planilha de oferta de disciplina ilegível, e nenhuma exportação de dados em lugar nenhum. O **Notary** junta tudo isso — matérias, professores, horários, provas, atividades, notas, faltas e plano de ensino — num painel só, com médias e coeficiente calculados automaticamente.

Como a faculdade não oferece exportação, os dados podem ser digitados na mão **ou importados diretamente dos PDFs/planilhas que ela já disponibiliza**: planilha de oferta de disciplinas, atestado de matrícula, histórico escolar e plano de ensino de cada matéria. O Notary faz o parsing de tudo isso no navegador e te entrega pronto pra usar.

## Recursos

- **Dashboard** com saudação, próximas provas/atividades, coeficiente de rendimento e horas de estudo acumuladas
- **Calendário** semanal e mensal com aulas, provas, atividades e aulas do plano de ensino, tudo na mesma grade
- **Matéria como hub central** — horários, notas, médias ponderadas por peso, contador de faltas (com limite de 25% calculado automaticamente) e plano de ensino, tudo numa página só
- **Montador de grade** — importa a planilha de oferta de disciplinas da faculdade e monta a grade horária escolhendo turmas, com detecção automática de conflito de horário e filtro por professor/disciplina/turno
- **Importação de PDF** — matrícula atual, histórico escolar completo e plano de ensino (cronograma de aulas) de cada matéria, parseados 100% no navegador
- **Matriz curricular** com progresso do curso por carga horária
- **Estudos** — timer Pomodoro que registra sessões de foco automaticamente, horas de estudo por matéria/tópico e anotações diárias em checklist
- **Autenticação real** — email/senha ou login com Google, multi-tenant (cada usuário só vê os próprios dados)
- **Tema** preto+vinho (escuro) e branco+vinho (claro), com toggle explícito

## Capturas de tela

<table>
<tr>
<td width="50%">

**Dashboard**
<img src="docs/screenshots/dashboard.png" alt="Dashboard com desempenho, matérias e próximas atividades">

</td>
<td width="50%">

**Calendário**
<img src="docs/screenshots/calendario.png" alt="Calendário semanal com aulas por horário">

</td>
</tr>
<tr>
<td width="50%">

**Matéria — hub central**
<img src="docs/screenshots/materia.png" alt="Página de uma matéria com média, faltas e horários">

</td>
<td width="50%">

**Montador de grade**
<img src="docs/screenshots/montador-grade.png" alt="Catálogo de turmas da faculdade e montador de grade sem conflito">

</td>
</tr>
</table>

## Destaques técnicos

Pontos do projeto que exigiram mais do que CRUD:

- **Importação de PDF sem backend** — atestado de matrícula, histórico escolar e plano de ensino são parseados 100% no navegador com `pdfjs-dist`. O parser do plano de ensino é o mais complexo: a célula "Aula/Data" fica centralizada verticalmente quando o conteúdo da aula quebra em várias linhas, então o algoritmo agrupa itens de texto em blocos por proximidade vertical (não por "número no início da linha") antes de extrair cada registro — validado contra um PDF real, 36/36 aulas corretas.
- **Importação de planilha genérica por faculdade** — em vez de fazer parsing hardcoded pro formato de uma faculdade específica, o usuário mapeia cada coluna da própria planilha (com sugestão automática por dicionário de sinônimos) e esse mapeamento fica lembrado por instituição em `localStorage`, então reimportações do semestre seguinte são um clique só.
- **Timer Pomodoro resistente a background throttling** — em vez de decrementar por `setInterval` (que o Chrome joga pra baixo em abas em segundo plano), a contagem deriva de um timestamp de término (`Date.now()` vs. `phaseEndAt`), então o relógio se autocorrige assim que a aba volta ao foco. Estado persiste em `localStorage` e sobrevive a reload de página inteira.
- **Autenticação real multi-tenant** — [Better Auth](https://www.better-auth.com/) com email/senha + Google OAuth, sessão em cookie httpOnly, e as 13 tabelas de dados pessoais isoladas por `user_id` no banco (17 tabelas no total, modeladas com Drizzle ORM).
- **Montador de grade com detecção de conflito** — cruza os horários das turmas escolhidas no catálogo da faculdade e sinaliza sobreposição em tempo real, com filtro por professor/disciplina/turno.

## Stack

- **Linguagem:** TypeScript em tudo (front e back)
- **Back-end:** Node.js + Express 5, PostgreSQL (hospedado no [Neon](https://neon.tech)), Drizzle ORM
- **Front-end:** React 19 + Vite, React Router, Context API (sem bibliotecas grandes de state management)
- **Autenticação:** [Better Auth](https://www.better-auth.com/) — email/senha + login social com Google
- **Parsing de PDF/planilha:** `pdfjs-dist` e `xlsx` (SheetJS), 100% no client
- **Testes:** Vitest + Supertest, contra o banco real

## Como rodar

Pré-requisitos: Node.js e um banco PostgreSQL próprio — não dá pra rodar o projeto sem isso, mesmo só testando localmente.

### 1. Criar o banco no Neon

1. Crie uma conta em [neon.tech](https://neon.tech) (tem plano gratuito, dá pra logar com GitHub/Google).
2. Crie um projeto novo (qualquer nome/região serve).
3. No dashboard do projeto, vá em **Connect** (ou **Dashboard → Connection string**) e copie a connection string no formato `postgresql://usuario:senha@host/banco?sslmode=require`.
4. Guarde essa string — é o valor de `DATABASE_URL` no próximo passo. (Se preferir, qualquer outro Postgres serve, não precisa ser Neon.)

### 2. Back-end

```bash
npm install
cp .env.example .env
```

Edite o `.env` e preencha:

```
DATABASE_URL=postgresql://usuario:senha@host/banco?sslmode=require
BETTER_AUTH_SECRET=qualquer-string-aleatoria-longa
```

- `DATABASE_URL`: a connection string copiada do Neon no passo anterior.
- `BETTER_AUTH_SECRET`: qualquer string aleatória (ex: gere uma com `openssl rand -hex 32`). É obrigatório — sem ele, criar conta e logar falham.
- `FRONTEND_URL`/`BACKEND_URL`: podem ficar com o default em dev (`http://localhost:5173`/`http://localhost:3000`); só precisam ser setados em produção, com as URLs reais.
- `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`: só necessários pro botão "Continuar com Google". Sem eles o app funciona normalmente (só com email/senha). Pra criar:
  1. [console.cloud.google.com](https://console.cloud.google.com/) → criar/selecionar um projeto.
  2. **APIs & Services → OAuth consent screen**: tipo *External*, nome do app, seu email de suporte.
  3. **Credentials → Create credentials → OAuth client ID**, tipo *Web application*.
  4. **Authorized redirect URI**: `{BACKEND_URL}/api/auth/callback/google` (`http://localhost:3000/api/auth/callback/google` em dev).
  5. Copie o Client ID e o Client Secret gerados pro `.env`.

Com o banco configurado, aplique o schema do Drizzle (cria/atualiza as tabelas no Neon):

```bash
npx drizzle-kit push
```

Suba o servidor em modo desenvolvimento:

```bash
npm run dev
```

O back-end sobe em `http://localhost:3000`.

### 3. Front-end

```bash
cd frontend
npm install
npm run dev
```

O front-end sobe em `http://localhost:5173` (espera a API em `http://localhost:3000`; ajustável via `VITE_API_URL`).

### Testes

```bash
npm test
```

Roda a suíte de testes de autenticação (Vitest + Supertest) contra o `DATABASE_URL` configurado no `.env`.

## Rotas da API

Autenticação (`/api/auth/*`) é toda gerenciada pelo Better Auth. As demais entidades pessoais seguem o mesmo padrão REST:

| Método | Rota    | Descrição                                     |
| ------ | ------- | ---------------------------------------------- |
| GET    | `/:entidade`     | Lista todos os registros do usuário logado |
| GET    | `/:entidade/:id` | Busca um registro (404 se não existir)     |
| POST   | `/:entidade`     | Cria um registro (valida campos obrigatórios) |
| PUT    | `/:entidade/:id` | Atualiza um registro (404 se não existir)  |
| DELETE | `/:entidade/:id` | Remove um registro (404 se não existir)    |

Aplicado a: `periods`, `professors`, `subjects`, `schedules`, `assignments`, `exams`, `study-sessions`, `daily-notes`, `curriculum-subjects`.

Rotas extras:

| Método | Rota                            | Descrição                                                        |
| ------ | ------------------------------- | ------------------------------------------------------------------ |
| GET    | `/subjects/:id/details`         | Matéria com `schedules`, `assignments` e `exams` relacionados      |
| PATCH  | `/subjects/:id/absences`        | Atualiza o contador de faltas da matéria                           |
| GET    | `/offerings`                    | Catálogo de ofertas da faculdade, com horários aninhados           |
| POST   | `/offerings/import`             | Substitui todo o catálogo pelo lote enviado (transação)            |
| POST   | `/syllabus-entries/import`      | Substitui o plano de ensino de uma matéria pelo lote enviado (transação) |
| DELETE | `/syllabus-entries/:id`         | Remove uma aula do plano de ensino                                 |
| PATCH  | `/auth/me`                      | Atualiza dados do perfil (parcial)                                 |
| PATCH  | `/auth/me/username`             | Define/atualiza o username único                                   |

Respostas de erro seguem o formato `{ "message": "..." }`, com os códigos `400` (corpo inválido, `id` inválido ou FK inexistente), `404` (não encontrado) e `500` (erro inesperado).

## Estrutura do projeto

```
src/                          back-end
  auth.ts                     configuração do Better Auth
  app.ts                      setup do Express e registro das rotas
  middleware/requireAuth.ts   injeta req.userId a partir da sessão
  db/
    schema.ts                 tabelas do Drizzle (fonte da verdade do modelo de dados)
    index.ts                  conexão com o banco
  lib/                        helpers compartilhados (parseId, isForeignKeyViolation)
  routes/                     um arquivo por entidade (periods, subjects, offerings, syllabus, ...)

frontend/src/                 front-end
  api/                        tipos + cliente HTTP tipado
  context/                    Auth, Period, Theme, Toast, PageTitle, GradeBuilder
  components/
    layout/                   Sidebar, TopBar, Footer, AppShell
    grid/                     WeeklyGrid (grade semanal reutilizável)
    ui/                       primitivos (Button, Badge, EmptyState, Skeleton, ...)
  pages/                      Landing, Dashboard, Calendar, Subjects/SubjectDetail, CurriculumMatrix,
                               Evaluations, Studies, Periods, Professors, FacultyProfessors (catálogo +
                               montador de grade), Profile, Settings
  lib/                        grades.ts, curriculum.ts, offeringsImport.ts, confirmGrade.ts,
                               scheduleConflicts.ts, historicoImport.ts, enrollmentImport.ts,
                               planoDeEnsinoImport.ts
```

## Roadmap

- [x] Exportar dados / notificações
- [x] Gráficos de horas de estudo
- [x] Timer do Pomodoro persistir entre navegações/em background

---

<p align="center">Projeto pessoal para organizar a própria vida acadêmica.</p>
