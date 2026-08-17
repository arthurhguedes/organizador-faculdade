import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./auth.js";
import authRouter from "./routes/auth.js";
import periodsRouter from "./routes/periods.js";
import professorsRouter from "./routes/professors.js";
import subjectsRouter from "./routes/subjects.js";
import schedulesRouter from "./routes/schedules.js";
import assignmentsRouter from "./routes/assignments.js";
import examsRouter from "./routes/exams.js";
import offeringsRouter from "./routes/offerings.js";
import syllabusRouter from "./routes/syllabus.js";
import studySessionsRouter from "./routes/studySessions.js";
import dailyNotesRouter from "./routes/dailyNotes.js";
import curriculumSubjectsRouter from "./routes/curriculumSubjects.js";
import { requireAuth } from "./middleware/requireAuth.js";

export const app = express();
app.use(cors({ origin: process.env.FRONTEND_URL ?? "http://localhost:5173", credentials: true }));

// Precisa vir antes do express.json(): o Better Auth faz o próprio parse do
// corpo da requisição, e um body-parser rodando antes consome o stream e
// quebra isso.
app.all("/api/auth/*splat", toNodeHandler(auth));

app.use(cookieParser());
app.use(express.json({ limit: "2mb" }));

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
app.use("/syllabus-entries", requireAuth, syllabusRouter);
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
