import type { SyllabusAssessment, SyllabusEntry, SyllabusEntryWeekly, SyllabusTopic } from "../../api/types";
import { resolveAssessmentTopics } from "../../lib/syllabusCoverage";
import { Badge } from "../../components/ui/Badge";

export function SyllabusPlanningSection({
  topics,
  assessments,
  entries,
}: {
  topics: SyllabusTopic[];
  assessments: SyllabusAssessment[];
  entries: SyllabusEntry[];
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
                  <td>{assessment.title}</td>
                  <td>{assessment.weightLabel ?? "—"}</td>
                  <td>{assessment.dateLabel ?? "—"}</td>
                  <td>{assessment.coverageLabel ?? "—"}</td>
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
