import { useState } from "react";
import type { SyllabusAssessment, SyllabusEntry, SyllabusEntryWeekly, SyllabusTopic } from "../../api/types";
import { resolveAssessmentTopics } from "../../lib/syllabusCoverage";
import { Badge } from "../../components/ui/Badge";

type AssessmentField = "title" | "weightLabel" | "dateLabel" | "coverageLabel";

function EditableCell({
  value,
  placeholder,
  onSave,
}: {
  value: string | null;
  placeholder: string;
  onSave: (value: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");

  const startEditing = () => {
    setDraft(value ?? "");
    setEditing(true);
  };

  const save = async () => {
    setEditing(false);
    const trimmed = draft.trim();
    if (trimmed === (value ?? "")) return;
    await onSave(trimmed);
  };

  if (editing) {
    return (
      <input
        autoFocus
        className="editable-cell-input"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          if (e.key === "Escape") setEditing(false);
        }}
      />
    );
  }

  return (
    <button
      type="button"
      className={value ? "editable-cell" : "editable-cell editable-cell--empty"}
      onClick={startEditing}
    >
      {value || placeholder}
    </button>
  );
}

export function SyllabusPlanningSection({
  topics,
  assessments,
  entries,
  onUpdateAssessment,
}: {
  topics: SyllabusTopic[];
  assessments: SyllabusAssessment[];
  entries: SyllabusEntry[];
  onUpdateAssessment: (id: number, field: AssessmentField, value: string) => Promise<void>;
}) {
  if (topics.length === 0 && assessments.length === 0) return null;

  const weeklyEntries = entries.filter((e): e is SyllabusEntryWeekly => e.format === "weekly");
  const sortedTopics = [...topics].sort((a, b) => a.position - b.position);
  const sortedAssessments = [...assessments].sort((a, b) => a.position - b.position);

  return (
    <section className="hub-section">
      <div className="hub-section__header">
        <h3>Planejamento da matéria</h3>
      </div>

      {sortedTopics.length > 0 && (
        <div className="syllabus-topics">
          {sortedTopics.map((topic) => (
            <div
              key={topic.id}
              className={topic.code.includes(".") ? "syllabus-topics__item syllabus-topics__item--sub" : "syllabus-topics__item"}
            >
              <span className="syllabus-topics__code">{topic.code}</span>
              <span>{topic.title}</span>
            </div>
          ))}
        </div>
      )}

      {sortedAssessments.length > 0 && (
        <table className="eval-table">
          <thead>
            <tr>
              <th>Avaliação</th>
              <th>Peso</th>
              <th>Data</th>
              <th>Cobertura</th>
              <th>Tópicos cobertos</th>
            </tr>
          </thead>
          <tbody>
            {sortedAssessments.map((assessment) => {
              const covered = resolveAssessmentTopics(assessment, weeklyEntries, topics);
              return (
                <tr key={assessment.id}>
                  <td>
                    <EditableCell
                      value={assessment.title}
                      placeholder="Título"
                      onSave={(value) => onUpdateAssessment(assessment.id, "title", value)}
                    />
                  </td>
                  <td>
                    <EditableCell
                      value={assessment.weightLabel}
                      placeholder="Peso"
                      onSave={(value) => onUpdateAssessment(assessment.id, "weightLabel", value)}
                    />
                  </td>
                  <td>
                    <EditableCell
                      value={assessment.dateLabel}
                      placeholder="Data"
                      onSave={(value) => onUpdateAssessment(assessment.id, "dateLabel", value)}
                    />
                  </td>
                  <td>
                    <EditableCell
                      value={assessment.coverageLabel}
                      placeholder="Cobertura"
                      onSave={(value) => onUpdateAssessment(assessment.id, "coverageLabel", value)}
                    />
                  </td>
                  <td>
                    {covered.length === 0 ? (
                      "—"
                    ) : (
                      <div className="syllabus-topics__badges">
                        {covered.map((topic) => (
                          <Badge key={topic.id} tone="neutral">
                            {topic.code}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </section>
  );
}
