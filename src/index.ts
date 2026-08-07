import express from "express";
import cors from "cors";
import periodsRouter from "./routes/periods.js";
import professorsRouter from "./routes/professors.js";
import subjectsRouter from "./routes/subjects.js";
import schedulesRouter from "./routes/schedules.js";
import assignmentsRouter from "./routes/assignments.js";
import examsRouter from "./routes/exams.js";
import offeringsRouter from "./routes/offerings.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));
const port = 3000;

app.get("/", (req, res) => {
  res.send("API do organizador de faculdade rodando!");
});

app.use("/periods", periodsRouter);
app.use("/professors", professorsRouter);
app.use("/subjects", subjectsRouter);
app.use("/schedules", schedulesRouter);
app.use("/assignments", assignmentsRouter);
app.use("/exams", examsRouter);
app.use("/offerings", offeringsRouter);

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
