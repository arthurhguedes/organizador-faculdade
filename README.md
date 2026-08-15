# Notary

App para organizar a vida acadêmica: matérias, professores, horários de aula, atividades, provas e notas. Os dados são inseridos manualmente, já que o site da faculdade não oferece exportação — mas o app importa a planilha de oferta de disciplinas que a faculdade disponibiliza por semestre e ajuda a montar a grade horária a partir dela.

## Stack

- TypeScript (front e back)
- Back-end: Node.js + Express 5, PostgreSQL (Neon), Drizzle ORM
- Front-end: React + Vite, React Router, Context API

## Modelo de dados

```
periods            id, label, start_date, end_date
professors         id, name, email
subjects           id, name, code (opcional), workload, period_id -> periods, professor_id -> professors
schedules          id, subject_id -> subjects, weekday, start_time, end_time
assignments        id, subject_id -> subjects, title, due_date, weight, grade
exams              id, subject_id -> subjects, title, date, weight, grade

course_offerings   id, professor_name, subject_code, subject_name, turma, curso,
                   vagas, depto, workload_hours, theory_hours, practice_hours, imported_at
offering_schedules id, offering_id -> course_offerings, weekday, start_time, end_time, kind
```

`course_offerings`/`offering_schedules` são o catálogo de turmas ofertadas pela faculdade (importado de planilha), separado das tabelas pessoais acima.

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
```

Copie o `.env.example` para `.env` na raiz do projeto:

```bash
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

## Rotas da API

Todas as entidades pessoais (`periods`, `professors`, `subjects`, `schedules`, `assignments`, `exams`) seguem o mesmo padrão de CRUD:

| Método | Rota           | Descrição                          |
| ------ | -------------- | ----------------------------------- |
| GET    | `/:entidade`     | Lista todos os registros            |
| GET    | `/:entidade/:id` | Busca um registro (404 se não existir) |
| POST   | `/:entidade`     | Cria um registro (valida campos obrigatórios) |
| PUT    | `/:entidade/:id` | Atualiza um registro (404 se não existir) |
| DELETE | `/:entidade/:id` | Remove um registro (404 se não existir) |

Rotas extras:

| Método | Rota                    | Descrição                                                       |
| ------ | ----------------------- | ---------------------------------------------------------------- |
| GET    | `/subjects/:id/details` | Matéria com seus `schedules`, `assignments` e `exams` relacionados |
| GET    | `/offerings`             | Todas as ofertas do catálogo, com seus horários aninhados |
| POST   | `/offerings/import`      | Substitui todo o catálogo pelo lote enviado (transação) |

Respostas de erro seguem o formato `{ "message": "..." }`, com os códigos:

- `400` — corpo inválido, `id` inválido na URL, ou referência (foreign key) inexistente
- `404` — registro não encontrado
- `500` — erro inesperado do servidor

## Estrutura do projeto

```
src/                         back-end
  db/
    schema.ts                tabelas do Drizzle
    index.ts                 conexão com o banco
  lib/
    http.ts                  helpers compartilhados (parseId, isForeignKeyViolation)
  routes/
    periods.ts, professors.ts, subjects.ts,
    schedules.ts, assignments.ts, exams.ts, offerings.ts
  index.ts                   setup do Express e registro das rotas

frontend/src/                front-end
  api/                       tipos + cliente HTTP tipado
  context/                   Period, Theme, Toast, PageTitle, GradeBuilder
  components/
    layout/                  Sidebar, TopBar, Footer, AppShell
    grid/                    WeeklyGrid (grade semanal reutilizável)
    ui/                      primitivos (Button, Badge, EmptyState, Skeleton, ...)
  pages/                     Dashboard, Subjects, SubjectDetail, Periods, Professors,
                             FacultyProfessors (catálogo + montador de grade), Profile, Terms, Settings
  lib/                       grades.ts, offeringsImport.ts, confirmGrade.ts, scheduleConflicts.ts
```

## Design

Tema preto+vinho (escuro, padrão) e branco+vinho (claro), com toggle. Direção visual completa documentada em `DESIGN.md`.

## Status

- [x] Back-end: CRUD completo + catálogo de ofertas, testado contra o banco real
- [x] Front-end: navegação, dashboard, matérias, catálogo/montador de grade, tema
- [x] Autenticação real (email/senha + Google, via Better Auth)
- [ ] Coeficiente de rendimento geral
