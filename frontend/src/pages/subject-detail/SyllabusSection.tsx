import { useRef, useState } from "react";
import { BookOpen, FileCheck } from "lucide-react";
import { syllabusEntriesApi, ApiError } from "../../api/client";
import { parsePlanoDeEnsinoPdf } from "../../lib/planoDeEnsinoImport";
import { formatDate } from "../../lib/grades";
import type { SyllabusEntry } from "../../api/types";
import { useToast } from "../../context/ToastContext";
import { EmptyState } from "../../components/ui/EmptyState";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { ConfirmDelete } from "../../components/ui/ConfirmDelete";

function kindLabel(kind: SyllabusEntry["kind"]): string | null {
  if (kind === "T") return "Teórica";
  if (kind === "P") return "Prática";
  return null;
}

export function SyllabusSection({
  subjectId,
  entries,
  onChange,
}: {
  subjectId: number;
  entries: SyllabusEntry[];
  onChange: () => void;
}) {
  const { notify } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [parsing, setParsing] = useState(false);

  const handleFile = async (file: File) => {
    setParsing(true);
    try {
      const parsed = await parsePlanoDeEnsinoPdf(file);
      if (parsed.length === 0) {
        notify("Não encontrei um cronograma de aulas nesse PDF", "error");
        return;
      }
      await syllabusEntriesApi.import(subjectId, parsed);
      notify(`${parsed.length} aula(s) importada(s) do plano de ensino`, "success");
      onChange();
    } catch (err) {
      notify(err instanceof ApiError ? err.message : "Não consegui ler esse PDF. Confira se é o plano de ensino.", "error");
    } finally {
      setParsing(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await syllabusEntriesApi.remove(id);
      notify("Aula removida", "success");
      onChange();
    } catch (err) {
      notify(err instanceof ApiError ? err.message : "Erro ao remover aula", "error");
    }
  };

  const sorted = [...entries].sort((a, b) => a.lessonNumber - b.lessonNumber);

  return (
    <section className="hub-section">
      <div className="hub-section__header">
        <h3>Plano de Ensino</h3>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
        <Button variant="ghost" icon={FileCheck} loading={parsing} onClick={() => inputRef.current?.click()}>
          {parsing ? "Lendo PDF..." : entries.length === 0 ? "Importar plano de ensino (PDF)" : "Reimportar (PDF)"}
        </Button>
      </div>

      {sorted.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="Nenhum plano de ensino importado ainda"
          description="Importe o PDF do plano de ensino do professor pra ver o conteúdo previsto de cada aula aqui e no Calendário."
        />
      ) : (
        <table className="eval-table">
          <thead>
            <tr>
              <th>Aula</th>
              <th>Data</th>
              <th>Tipo</th>
              <th>Conteúdo previsto</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {sorted.map((entry) => (
              <tr key={entry.id}>
                <td className="eval-table__num">{entry.lessonNumber}</td>
                <td>{formatDate(entry.date)}</td>
                <td>{kindLabel(entry.kind) && <Badge tone="neutral">{kindLabel(entry.kind)}</Badge>}</td>
                <td>{entry.content}</td>
                <td>
                  <ConfirmDelete onConfirm={() => handleDelete(entry.id)} label="Remover aula" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
