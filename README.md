<div align="center">

<img src="docs/brand/notary-banner.svg" alt="Notary — matérias, horários, provas e notas" width="100%">

[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)](#stack)
[![React](https://img.shields.io/badge/React_19-149ECA?style=flat&logo=react&logoColor=white)](#stack)
[![Express](https://img.shields.io/badge/Express_5-000000?style=flat&logo=express&logoColor=white)](#stack)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-4169E1?style=flat&logo=postgresql&logoColor=white)](#stack)
[![Drizzle](https://img.shields.io/badge/Drizzle-ORM-C5F74F?style=flat&logo=drizzle&logoColor=black)](#stack)
[![Better Auth](https://img.shields.io/badge/Auth-Better_Auth-black?style=flat)](#stack)
[![CI](https://github.com/arthurhguedes/organizador-faculdade/actions/workflows/ci.yml/badge.svg)](https://github.com/arthurhguedes/organizador-faculdade/actions/workflows/ci.yml)

### [🔗 Acessar o Notary](https://notary-arthurhguedes-projects.vercel.app)

> O back-end roda no free tier do Render e "dorme" após 15min sem acesso — o primeiro carregamento pode levar ~50s enquanto ele acorda sozinho. Os acessos seguintes são instantâneos.

</div>

<br>

<p align="center">
  <img src="docs/screenshots/landing.png" alt="Página inicial do Notary" width="100%">
</p>

## O que é

A maioria dos portais de faculdade é uma bagunça: notas em uma aba, horário em outra, PDF de matrícula pra conferir turma, planilha de oferta de disciplina ilegível, e nenhuma exportação de dados em lugar nenhum. O **Notary** junta tudo isso — matérias, professores, horários, provas, atividades, notas, faltas, plano de ensino, matriz curricular e requerimentos — num painel só, com médias e coeficiente calculados automaticamente.

Como a faculdade não oferece exportação, os dados podem ser digitados na mão **ou importados dos próprios arquivos que ela já disponibiliza**: a planilha de oferta de disciplinas do semestre e quatro PDFs diferentes (atestado de matrícula, histórico escolar, plano de ensino de cada matéria e matriz curricular do curso). Todo esse parsing acontece no navegador — o back-end nunca recebe arquivo, só dados já estruturados.

## Recursos

- <img src="docs/icons/dashboard.svg" width="17" alt=""> **Dashboard** — saudação, próximas provas e atividades, média geral, média do período, horas de estudo e coeficiente ponderado por carga horária
- <img src="docs/icons/calendario.svg" width="17" alt=""> **Calendário** — grade semanal de aulas e grade mensal com provas, atividades e as aulas do plano de ensino; arrastar um evento pra outro dia muda a data
- <img src="docs/icons/materia.svg" width="17" alt=""> **Matéria como hub central** — horários, notas, média ponderada por peso, contador de faltas (com o limite de 25% calculado sozinho) e plano de ensino, tudo numa página só
- <img src="docs/icons/montador-grade.svg" width="17" alt=""> **Montador de grade** — importa a planilha de oferta da faculdade e monta a grade escolhendo turmas, com detecção de conflito de horário e filtro por professor, disciplina e turno
- <img src="docs/icons/importacao.svg" width="17" alt=""> **Importação de PDF e planilha** — atestado de matrícula, histórico escolar, plano de ensino e matriz curricular, parseados 100% no navegador
- <img src="docs/icons/matriz.svg" width="17" alt=""> **Matriz curricular** — o curso inteiro (concluído, cursando e pendente) com progresso por carga horária
- <img src="docs/icons/estudos.svg" width="17" alt=""> **Estudos** — timer Pomodoro que registra as sessões de foco sozinho, gráficos de horas por dia e por matéria, e anotações diárias em checklist
- <img src="docs/icons/requerimentos.svg" width="17" alt=""> **Requerimentos** — quebra de pré-requisito, ajuste de matrícula, trancamento e aproveitamento, com status e o que falta pra aprovar
- <img src="docs/icons/auth.svg" width="17" alt=""> **Autenticação real** — email/senha ou login com Google, multi-tenant (cada usuário só enxerga os próprios dados)
- <img src="docs/icons/tema.svg" width="17" alt=""> **Tema** preto+vinho (escuro) e branco+vinho (claro), com toggle explícito

## Capturas de tela

<table>
<tr>
<td width="50%">

**Dashboard**
<img src="docs/screenshots/dashboard.png" alt="Dashboard com desempenho, matérias do período e próximas atividades">

</td>
<td width="50%">

**Calendário**
<img src="docs/screenshots/calendario.png" alt="Grade mensal com provas, atividades e aulas do plano de ensino">

</td>
</tr>
<tr>
<td width="50%">

**Matéria — hub central**
<img src="docs/screenshots/materia.png" alt="Página de uma matéria com média, faltas, horários e plano de ensino">

</td>
<td width="50%">

**Montador de grade**
<img src="docs/screenshots/montador-grade.png" alt="Catálogo de turmas da faculdade e grade em construção sem conflito">

</td>
</tr>
<tr>
<td width="50%">

**Estudos**
<img src="docs/screenshots/estudos.png" alt="Gráficos de horas de estudo por dia e por matéria, com histórico de sessões">

</td>
<td width="50%">

**Matriz curricular**
<img src="docs/screenshots/matriz-curricular.png" alt="Matriz curricular com progresso do curso por carga horária">

</td>
</tr>
<tr>
<td width="50%">

**Provas e atividades**
<img src="docs/screenshots/avaliacoes.png" alt="Lista global de provas e atividades com filtro por matéria">

</td>
<td width="50%">

**Requerimentos**
<img src="docs/screenshots/requerimentos.png" alt="Requerimentos formais com tipo, matéria, status e data de resolução">

</td>
</tr>
</table>

## Como funciona

<p align="center">
  <img src="docs/diagrams/arquitetura.svg" alt="Arquitetura: o navegador faz o parsing dos arquivos e conversa por JSON com a API Express, que acessa o Postgres do Neon via Drizzle" width="100%">
</p>

O front-end é uma SPA em React que fala com uma API REST em Express por JSON, autenticada por cookie de sessão httpOnly. A decisão estrutural que mais define o projeto está na coluna da esquerda: **PDF e planilha nunca chegam ao servidor**. O navegador abre o arquivo, extrai as linhas e manda pro back-end só o registro já pronto — o que dispensa upload, storage e fila de processamento, e mantém o back-end como um CRUD simples sobre o banco.

## Modelo de dados

<p align="center">
  <img src="docs/diagrams/modelo-de-dados.svg" alt="As 20 tabelas do Notary, com subjects no centro dos dados pessoais e o catálogo da faculdade separado" width="100%">
</p>

São 20 tabelas em três blocos com propósitos diferentes:

- **Dados pessoais** — o que o usuário de fato cursa. `subjects` é o hub: horários, atividades, provas, faltas, sessões de estudo e plano de ensino penduram nela.
- **Catálogo da faculdade** — `course_offerings`/`offering_schedules` são as turmas que a faculdade oferece no semestre (a maioria, o usuário nunca vai cursar). Importar é sempre um *replace* total: é um snapshot do semestre, não um histórico. Pelo mesmo raciocínio, `curriculum_subjects` é o universo exigido pelo curso, sem FK com as matérias reais — concluir uma matéria na matriz é uma ação manual, não algo inferido.
- **Better Auth** — `users`, `sessions`, `accounts` e `verifications`. As outras 16 tabelas carregam `user_id` com `ON DELETE CASCADE`, o que faz o isolamento multi-tenant ser uma propriedade do schema e não algo que cada rota precisa lembrar de aplicar.

## Destaques técnicos

Pontos do projeto que exigiram mais do que CRUD:

- **Quatro parsers de PDF, sem backend** — atestado de matrícula, histórico escolar, plano de ensino e matriz curricular são lidos no navegador com `pdfjs-dist`. O do plano de ensino é o mais complicado: a célula "Aula/Data" fica centralizada verticalmente quando o conteúdo da aula quebra em várias linhas, então o número da aula nem sempre está na primeira linha do bloco. O parser agrupa itens de texto em blocos por proximidade vertical antes de extrair cada registro — validado contra um PDF real, 36/36 aulas corretas. Linhas da tabela de avaliação que têm data e peso de verdade viram provas automaticamente, preservando a nota já lançada numa reimportação.
- **Importação de planilha genérica por faculdade** — em vez de hardcodar o formato de uma faculdade, a lib lê a planilha como headers + linhas cruas e o usuário associa cada campo à coluna correspondente, com sugestão automática por dicionário de sinônimos. O mapeamento confirmado fica lembrado por assinatura de headers **e** por instituição, então a reimportação do semestre seguinte é um clique só — e se a faculdade mudar as colunas, o passo de conferência reaparece pré-preenchido em vez de importar errado calado.
- **Timer Pomodoro imune ao throttling de aba em segundo plano** — em vez de decrementar por `setInterval` (que o Chrome estrangula em abas inativas), a contagem deriva de um timestamp de término: o valor exibido é sempre `phaseEndAt - Date.now()`, então o relógio se autocorrige assim que a aba volta ao foco. O estado vive num Context com persistência em `localStorage` e sobrevive a navegação e reload.
- **Drag and drop no calendário sem biblioteca** — arrastar uma prova ou atividade pra outro dia dispara o `PUT` correspondente. O par tipo+id do evento viaja no próprio `dataTransfer`, não em `useState`: guardar o evento arrastado em estado é uma race condition real, porque `dragstart` e `drop` podem cair no mesmo tick, antes do React re-renderizar.
- **Autenticação real multi-tenant** — [Better Auth](https://www.better-auth.com/) com email/senha, username e Google OAuth, sessão em cookie httpOnly. `users.id` continua `serial`: o Postgres gera o id em vez do nanoid padrão do Better Auth, pra não quebrar as FKs das outras tabelas.
- **Factory de router CRUD** — as nove entidades que só fazem CRUD padrão compartilham um único router parametrizado (tabela, schema Zod, mensagens de erro, checagem de dono), em vez de nove arquivos quase idênticos. Toda rota valida o corpo com Zod, e o filtro por `user_id` acontece no mesmo lugar pra todas.
- **Gráficos escritos à mão** — as visualizações de horas de estudo são SVG puro, sem lib de chart, com uma paleta categórica de 8 cores validada contra daltonismo e cor estável por matéria entre os gráficos.

## Stack

- **Linguagem:** TypeScript em tudo (front e back)
- **Back-end:** Node.js + Express 5, PostgreSQL (hospedado no [Neon](https://neon.tech)), Drizzle ORM, validação com Zod
- **Front-end:** React 19 + Vite, React Router, Context API (sem bibliotecas grandes de state management)
- **Autenticação:** [Better Auth](https://www.better-auth.com/) — email/senha, username e login social com Google
- **Parsing de PDF/planilha:** `pdfjs-dist` e `xlsx` (SheetJS), 100% no client
- **Testes:** Vitest + Supertest, com CI no GitHub Actions
- **Deploy:** front-end na Vercel, API no Render, banco no Neon

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

## Testes e CI

```bash
npm test              # back-end: auth, CRUD e validação (Vitest + Supertest)
cd frontend && npm test   # front-end: os parsers de PDF e planilha
```

São 118 testes: 60 no back-end (auth, contrato das rotas CRUD e validação Zod) e 58 nos parsers, esses últimos rodando contra trechos reais dos arquivos da faculdade guardados como fixture. Os testes de auth precisam de um Postgres de verdade (o Better Auth grava usuário, sessão e conta), então usam o `DATABASE_URL` do `.env`.

O [workflow de CI](.github/workflows/ci.yml) roda em todo push e PR, em dois jobs: back-end (`tsc --noEmit` + testes contra um Postgres descartável que o próprio runner sobe, em vez de apontar pro Neon) e front-end (`tsc -b` + lint + testes).

## Rotas da API

Autenticação (`/api/auth/*`) é toda gerenciada pelo Better Auth. As entidades que só fazem CRUD padrão compartilham um router gerado por factory:

| Método | Rota             | Descrição                                  |
| ------ | ---------------- | ------------------------------------------ |
| GET    | `/:entidade`     | Lista todos os registros do usuário logado |
| GET    | `/:entidade/:id` | Busca um registro (404 se não existir)     |
| POST   | `/:entidade`     | Cria um registro (corpo validado com Zod)  |
| PUT    | `/:entidade/:id` | Atualiza um registro (404 se não existir)  |
| DELETE | `/:entidade/:id` | Remove um registro (404 se não existir)    |

Aplicado a: `periods`, `professors`, `schedules`, `assignments`, `exams`, `study-sessions`, `daily-notes`, `curriculum-subjects` e `academic-requests`.

Rotas próprias:

| Método | Rota                                | Descrição                                                              |
| ------ | ----------------------------------- | ---------------------------------------------------------------------- |
| GET    | `/subjects`                         | Matérias do usuário                                                    |
| GET    | `/subjects/details`                 | **Todas** as matérias já com filhos, em 7 queries fixas (mata o N+1)   |
| GET    | `/subjects/:id/details`             | Uma matéria com horários, atividades, provas, plano de ensino e tópicos |
| PATCH  | `/subjects/:id/absences`            | Atualiza o contador de faltas da matéria                               |
| GET    | `/attendance-marks`                 | Faltas marcadas por data                                               |
| POST   | `/attendance-marks`                 | Marca uma falta numa data e incrementa o contador da matéria           |
| DELETE | `/attendance-marks/:id`             | Desmarca a falta e decrementa o contador                               |
| GET    | `/offerings`                        | Catálogo de ofertas da faculdade, com horários aninhados                |
| POST   | `/offerings/import`                 | Substitui todo o catálogo pelo lote enviado (transação)                 |
| DELETE | `/offerings`                        | Limpa o catálogo                                                        |
| GET    | `/syllabus-entries`                 | Plano de ensino (opcionalmente filtrado por matéria)                    |
| POST   | `/syllabus-entries/import`          | Substitui o plano de ensino de uma matéria e cria as provas do cronograma (transação) |
| PATCH  | `/syllabus-entries/assessments/:id` | Edita uma linha da tabela de avaliação                                  |
| DELETE | `/syllabus-entries/subject/:id`     | Remove o plano de ensino inteiro de uma matéria                         |
| DELETE | `/syllabus-entries/:id`             | Remove uma aula do plano de ensino                                      |
| GET    | `/auth/me`                          | Dados do usuário logado                                                 |
| PATCH  | `/auth/me`                          | Atualiza o perfil (parcial — cada aba salva sem apagar a outra)          |
| PATCH  | `/auth/me/username`                 | Define/atualiza o username único (409 se já existir)                    |

Respostas de erro seguem o formato `{ "message": "..." }`, com os códigos `400` (corpo inválido, `id` inválido ou FK inexistente), `401` (sem sessão), `404` (não encontrado), `409` (conflito de unicidade) e `500` (erro inesperado).

## Estrutura do projeto

```
src/                          back-end
  auth.ts                     configuração do Better Auth
  app.ts                      setup do Express e registro das rotas
  middleware/requireAuth.ts   injeta req.userId a partir da sessão
  db/
    schema.ts                 tabelas e índices do Drizzle (fonte da verdade do modelo)
    index.ts                  conexão com o banco
  lib/
    crudRouter.ts             factory do router CRUD usado por 9 entidades
    validate.ts               helpers de schema Zod compartilhados
    cascade.ts, http.ts, ownership.ts
  routes/                     um arquivo por entidade
  *.test.ts                   auth, CRUD e validação

frontend/src/                 front-end
  api/                        tipos + cliente HTTP tipado
  context/                    Auth, Period, Theme, Toast, PageTitle, GradeBuilder, Pomodoro
  hooks/                      useDashboardData, useAcademicStats, useEntityList
  components/
    layout/                   Sidebar, TopBar, Footer, AppShell, NotificationBell
    grid/                     WeeklyGrid e MonthCalendar
    studies/                  PomodoroTimer, StudyCharts
    ui/                       primitivos (Button, Badge, EmptyState, Skeleton, ...)
  pages/                      Landing, Dashboard, Calendar, Subjects/SubjectDetail,
                              CurriculumMatrix, AcademicRequests, Evaluations, Studies,
                              Notes, Periods, Professors, FacultyProfessors, Profile,
                              Settings, Terms e o fluxo de auth
  lib/                        parsers (historicoImport, enrollmentImport, planoDeEnsinoImport,
                              curriculumMatrixImport, offeringsImport), cálculo (grades,
                              curriculum, scheduleConflicts, syllabusCoverage) e
                              utilitários (confirmGrade, dataExport, chartColors, avatarImage)

docs/
  brand/                      marca e banner (SVG)
  diagrams/                   arquitetura e modelo de dados (SVG)
  icons/                      um ícone por recurso (SVG)
  screenshots/                capturas usadas neste README
```

---

<p align="center">Projeto pessoal para organizar a própria vida acadêmica.</p>

<p align="center">
  <a href="https://www.linkedin.com/in/arthurhenriqueguedes/">LinkedIn</a> ·
  <a href="https://github.com/arthurhguedes">GitHub</a> ·
  <a href="https://www.instagram.com/arthur.guedes7">Instagram</a>
</p>
