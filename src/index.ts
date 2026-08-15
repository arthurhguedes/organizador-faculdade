import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import authRouter from "./routes/auth.js";
import periodsRouter from "./routes/periods.js";
import professorsRouter from "./routes/professors.js";
import subjectsRouter from "./routes/subjects.js";
import schedulesRouter from "./routes/schedules.js";
import assignmentsRouter from "./routes/assignments.js";
import examsRouter from "./routes/exams.js";
import offeringsRouter from "./routes/offerings.js";
import studySessionsRouter from "./routes/studySessions.js";
import dailyNotesRouter from "./routes/dailyNotes.js";
import curriculumSubjectsRouter from "./routes/curriculumSubjects.js";
import { requireAuth } from "./middleware/requireAuth.js";

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

const app = express();
app.use(cors({ origin: process.env.FRONTEND_URL ?? "http://localhost:5173", credentials: true }));
app.use(cookieParser());
app.use(express.json({ limit: "2mb" }));
// Hosts como Railway/Render injetam a porta via env var; 3000 é só o fallback local.
const port = process.env.PORT ? Number(process.env.PORT) : 3000;

app.get("/", (req, res) => {
  res.send("API do Notary rodando!");
});

app.use("/auth", authRouter);
app.use("/periods", requireAuth, periodsRouter);
app.use("/professors", requireAuth, professorsRouter);
app.use("/subjects", requireAuth, subjectsRouter);
app.use("/schedules", requireAuth, schedulesRouter);
app.use("/assignments", requireAuth, assignmentsRouter);
app.use("/exams", requireAuth, examsRouter);
app.use("/offerings", requireAuth, offeringsRouter);
app.use("/study-sessions", requireAuth, studySessionsRouter);
app.use("/daily-notes", requireAuth, dailyNotesRouter);
app.use("/curriculum-subjects", requireAuth, curriculumSubjectsRouter);

app.use((err: unknown, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err);

  const isJsonParseError = err instanceof SyntaxError && "status" in err && err.status === 400;
  if (isJsonParseError) {
    return res.status(400).json({ message: "JSON inválido no corpo da requisição" });
  }

  res.status(500).json({ message: "Erro interno do servidor" });
});

app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});
