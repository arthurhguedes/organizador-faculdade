import express from "express";
import periodsRouter from "./routes/periods.js";
import professorsRouter from "./routes/professors.js";
import subjectsRouter from "./routes/subjects.js";
import schedulesRouter from "./routes/schedules.js";
import assignmentsRouter from "./routes/assignments.js";
import examsRouter from "./routes/exams.js";

const app = express();
app.use(express.json());
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

app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});
