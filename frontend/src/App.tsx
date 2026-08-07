import { useState } from "react";
import { EntityPanel, type Field } from "./EntityPanel";
import { SubjectDetails } from "./SubjectDetails";
import "./App.css";

const tabs: { key: string; title: string; fields: Field[] }[] = [
  {
    key: "periods",
    title: "Períodos",
    fields: [
      { key: "label", label: "Label", type: "text" },
      { key: "startDate", label: "Início", type: "date" },
      { key: "endDate", label: "Fim", type: "date" },
    ],
  },
  {
    key: "professors",
    title: "Professores",
    fields: [
      { key: "name", label: "Nome", type: "text" },
      { key: "email", label: "Email", type: "text" },
    ],
  },
  {
    key: "subjects",
    title: "Matérias",
    fields: [
      { key: "name", label: "Nome", type: "text" },
      { key: "workload", label: "Carga horária", type: "number" },
      { key: "periodId", label: "ID do período", type: "number" },
      { key: "professorId", label: "ID do professor", type: "number" },
    ],
  },
  {
    key: "schedules",
    title: "Horários",
    fields: [
      { key: "subjectId", label: "ID da matéria", type: "number" },
      { key: "weekday", label: "Dia da semana", type: "text" },
      { key: "startTime", label: "Início", type: "text" },
      { key: "endTime", label: "Fim", type: "text" },
    ],
  },
  {
    key: "assignments",
    title: "Atividades",
    fields: [
      { key: "subjectId", label: "ID da matéria", type: "number" },
      { key: "title", label: "Título", type: "text" },
      { key: "dueDate", label: "Entrega", type: "date" },
      { key: "weight", label: "Peso", type: "number" },
      { key: "grade", label: "Nota", type: "number", optional: true },
    ],
  },
  {
    key: "exams",
    title: "Provas",
    fields: [
      { key: "subjectId", label: "ID da matéria", type: "number" },
      { key: "title", label: "Título", type: "text" },
      { key: "date", label: "Data", type: "date" },
      { key: "weight", label: "Peso", type: "number" },
      { key: "grade", label: "Nota", type: "number", optional: true },
    ],
  },
];

export default function App() {
  const [active, setActive] = useState(tabs[0]!.key);
  const current = tabs.find((t) => t.key === active)!;

  return (
    <div className="app">
      <h1>Organizador Acadêmico</h1>

      <nav>
        {tabs.map((t) => (
          <button
            key={t.key}
            className={t.key === active ? "active" : ""}
            onClick={() => setActive(t.key)}
          >
            {t.title}
          </button>
        ))}
      </nav>

      <EntityPanel entity={current.key} title={current.title} fields={current.fields} />

      {active === "subjects" && <SubjectDetails />}
    </div>
  );
}
