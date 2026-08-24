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
import attendanceMarksRouter from "./routes/attendanceMarks.js";
import studySessionsRouter from "./routes/studySessions.js";
import dailyNotesRouter from "./routes/dailyNotes.js";
import curriculumSubjectsRouter from "./routes/curriculumSubjects.js";
import academicRequestsRouter from "./routes/academicRequests.js";
import { requireAuth } from "./middleware/requireAuth.js";

export const app = express();
app.disable("x-powered-by");
app.use(cors({ origin: process.env.FRONTEND_URL ?? "http://localhost:5173", credentials: true }));

// O Better Auth faz o próprio parse do corpo da requisição (não dá pra usar
// express.json() na frente, ver comentário abaixo), então essas rotas não
// passam pelo limite de 2mb configurado mais adiante — sem isso, dava pra
// mandar um payload de qualquer tamanho pro /sign-up/email (testado com um
// campo "name" de 5MB aceito de boa) e estourar memória/banco.
const MAX_AUTH_BODY_BYTES = 100_000;
app.use("/api/auth", (req, res, next) => {
  const contentLength = Number(req.headers["content-length"] ?? 0);
  if (contentLength > MAX_AUTH_BODY_BYTES) {
    return res.status(413).json({ message: "Corpo da requisição muito grande" });
  }
  next();
});

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
app.use("/attendance-marks", requireAuth, attendanceMarksRouter);
app.use("/study-sessions", requireAuth, studySessionsRouter);
app.use("/daily-notes", requireAuth, dailyNotesRouter);
app.use("/curriculum-subjects", requireAuth, curriculumSubjectsRouter);
app.use("/academic-requests", requireAuth, academicRequestsRouter);

app.use((err: unknown, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err);

  const isJsonParseError = err instanceof SyntaxError && "status" in err && err.status === 400;
  if (isJsonParseError) {
    return res.status(400).json({ message: "JSON inválido no corpo da requisição" });
  }

  res.status(500).json({ message: "Erro interno do servidor" });
});
