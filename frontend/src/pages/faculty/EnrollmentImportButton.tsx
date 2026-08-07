import { useRef, useState } from "react";
import { FileCheck } from "lucide-react";
import { parseEnrollmentPdf } from "../../lib/enrollmentImport";
import { professorsApi, subjectsApi, ApiError } from "../../api/client";
import { createProfessorMatcher } from "../../lib/professorMatch";
import type { Offering } from "../../api/types";
import { useGradeBuilder } from "../../context/GradeBuilderContext";
import { usePeriods } from "../../context/PeriodContext";
import { useToast } from "../../context/ToastContext";
import { Button } from "../../components/ui/Button";

const PLACEHOLDER_PROFESSOR_NAME = "Professor a definir";

export function EnrollmentImportButton({ offerings }: { offerings: Offering[] }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [parsing, setParsing] = useState(false);
  const { isSelected, toggle } = useGradeBuilder();
  const { selectedPeriodId } = usePeriods();
  const { notify } = useToast();

  const handleFile = async (file: File) => {
    setParsing(true);
    try {
      const entries = await parseEnrollmentPdf(file);
      if (entries.length === 0) {
        notify("Não encontrei nenhuma disciplina reconhecível nesse PDF", "error");
        return;
      }

      const matchedOfferings: Offering[] = [];
      const unmatched: typeof entries = [];

      for (const entry of entries) {
        const offering = offerings.find((o) => o.subjectCode === entry.code && o.turma === entry.turma);
        if (offering) {
          matchedOfferings.push(offering);
        } else {
          unmatched.push(entry);
        }
      }

      for (const offering of matchedOfferings) {
        if (!isSelected(offering.id)) toggle(offering.id);
      }
      if (matchedOfferings.length > 0) {
        notify(`${matchedOfferings.length} disciplina(s) selecionada(s) na grade a partir do PDF`, "success");
      }

      if (unmatched.length > 0) {
        if (!selectedPeriodId) {
          notify(`${unmatched.length} disciplina(s) não encontrada(s) no catálogo — selecione um período para adicioná-las direto`, "error");
        } else {
          const professors = await professorsApi.list();
          const findOrCreateProfessor = createProfessorMatcher(professors);
          const placeholder = await findOrCreateProfessor(PLACEHOLDER_PROFESSOR_NAME);

          for (const entry of unmatched) {
            await subjectsApi.create({
              name: entry.rawLabel || entry.code,
              code: entry.code,
              workload: 0,
              periodId: selectedPeriodId,
              professorId: placeholder.id,
            });
          }

          notify(
            `${unmatched.length} disciplina(s) sem correspondência no catálogo foram adicionadas direto às suas matérias, sem horário (ajuste depois)`,
            "success",
          );
        }
      }
    } catch (err) {
      notify(err instanceof ApiError ? err.message : "Não consegui ler esse PDF. Confira se é o atestado de matrícula.", "error");
    } finally {
      setParsing(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="enrollment-import-row">
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
        {parsing ? "Lendo PDF..." : "Importar matrícula atual (PDF)"}
      </Button>
    </div>
  );
}
