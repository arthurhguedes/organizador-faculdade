import { useRef, useState } from "react";
import { FileCheck } from "lucide-react";
import { parseEnrollmentPdf } from "../../lib/enrollmentImport";
import type { Offering } from "../../api/types";
import { useGradeBuilder } from "../../context/GradeBuilderContext";
import { useToast } from "../../context/ToastContext";
import { Button } from "../../components/ui/Button";

export function EnrollmentImportButton({ offerings }: { offerings: Offering[] }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [parsing, setParsing] = useState(false);
  const { isSelected, toggle } = useGradeBuilder();
  const { notify } = useToast();

  const handleFile = async (file: File) => {
    setParsing(true);
    try {
      const entries = await parseEnrollmentPdf(file);
      if (entries.length === 0) {
        notify("Não encontrei nenhuma disciplina reconhecível nesse PDF", "error");
        return;
      }

      let matched = 0;
      const unmatched: string[] = [];

      for (const entry of entries) {
        const offering = offerings.find((o) => o.subjectCode === entry.code && o.turma === entry.turma);
        if (offering) {
          matched++;
          if (!isSelected(offering.id)) toggle(offering.id);
        } else {
          unmatched.push(`${entry.code}-${entry.turma}`);
        }
      }

      if (matched > 0) {
        notify(`${matched} disciplina(s) selecionada(s) na grade a partir do PDF`, "success");
      }
      if (unmatched.length > 0) {
        notify(
          `${unmatched.length} não encontrada(s) no catálogo importado (${unmatched.join(", ")}) — adicione manualmente ou importe a planilha do semestre correto`,
          "error",
        );
      }
    } catch {
      notify("Não consegui ler esse PDF. Confira se é o atestado de matrícula.", "error");
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
