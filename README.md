# Organizador Acadêmico

API para organizar a vida acadêmica: matérias, professores, horários de aula, atividades e provas. Os dados são inseridos manualmente, já que o site da faculdade não oferece exportação.

Projeto pessoal de aprendizado (front-end ainda não construído).

## Stack

- TypeScript
- Node.js + Express 5
- PostgreSQL (Neon)
- Drizzle ORM

## Modelo de dados

```
periods       id, label, start_date, end_date
professors    id, name, email
subjects      id, name, workload, period_id -> periods, professor_id -> professors
schedules     id, subject_id -> subjects, weekday, start_time, end_time
assignments   id, subject_id -> subjects, title, due_date, weight, grade
exams         id, subject_id -> subjects, title, date, weight, grade
```

## Como rodar

Pré-requisitos: Node.js e um banco PostgreSQL (o projeto foi feito usando [Neon](https://neon.tech)).

```bash
npm install
```

Crie um arquivo `.env` na raiz com a connection string do banco:

```
DATABASE_URL=postgresql://usuario:senha@host/banco?sslmode=require
```

Se as tabelas ainda não existirem no banco, gere e aplique as migrations do Drizzle:

```bash
npx drizzle-kit generate
npx drizzle-kit migrate
```

Suba o servidor em modo desenvolvimento (reinicia sozinho a cada alteração):

```bash
npm run dev
```

O servidor sobe em `http://localhost:3000`.

## Rotas da API

Todas as entidades (`periods`, `professors`, `subjects`, `schedules`, `assignments`, `exams`) seguem o mesmo padrão de CRUD:

| Método | Rota           | Descrição                          |
| ------ | -------------- | ----------------------------------- |
| GET    | `/:entidade`     | Lista todos os registros            |
| GET    | `/:entidade/:id` | Busca um registro (404 se não existir) |
| POST   | `/:entidade`     | Cria um registro (valida campos obrigatórios) |
| PUT    | `/:entidade/:id` | Atualiza um registro (404 se não existir) |
| DELETE | `/:entidade/:id` | Remove um registro (404 se não existir) |

Rota extra:

| Método | Rota                    | Descrição                                                       |
| ------ | ----------------------- | ---------------------------------------------------------------- |
| GET    | `/subjects/:id/details` | Matéria com seus `schedules`, `assignments` e `exams` relacionados |

Respostas de erro seguem o formato `{ "message": "..." }`, com os códigos:

- `400` — corpo inválido, `id` inválido na URL, ou referência (foreign key) inexistente
- `404` — registro não encontrado
- `500` — erro inesperado do servidor

## Estrutura do projeto

```
src/
  db/
    schema.ts     tabelas do Drizzle
    index.ts      conexão com o banco
  lib/
    http.ts       helpers compartilhados (parseId, isForeignKeyViolation)
  routes/
    periods.ts, professors.ts, subjects.ts,
    schedules.ts, assignments.ts, exams.ts
  index.ts        setup do Express e registro das rotas
```

## Status

- [x] Backend: CRUD completo das 6 entidades, testado contra o banco real
- [ ] Front-end (React + Vite)
