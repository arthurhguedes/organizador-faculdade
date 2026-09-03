import { useRef, useState } from "react";
import { FileCheck } from "lucide-react";
import { usePeriods } from "../../context/PeriodContext";
import { ApiError } from "../../api/client";
import { useToast } from "../../context/ToastContext";
import { parseHistoricoPdf, HistoricoReadError } from "../../lib/historicoImport";
import { applyHistorico } from "../../lib/applyHistorico";
import { Button } from "../../components/ui/Button";

export function HistoricoTab() {
  const { refresh } = usePeriods();
  const { notify } = useToast();
  const [importing, setImporting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setImporting(true);
    try {
      const parsed = await parseHistoricoPdf(file);
      if (parsed.entries.length === 0) {
        notify("Não encontrei nenhuma disciplina reconhecível nesse histórico", "error");
        return;
      }
      const result = await applyHistorico(parsed);
      notify(
        `${result.periodsCreated} período(s) e ${result.subjectsCreated} matéria(s) importados do histórico` +
          (result.subjectsSkipped > 0 ? ` (${result.subjectsSkipped} já existiam e foram ignoradas)` : ""),
        "success",
      );
      refresh();
    } catch (err) {
      if (err instanceof HistoricoReadError) {
        notify(err.message, "error");
      } else {
        notify(err instanceof ApiError ? err.message : "Não consegui ler esse PDF. Confira se é o histórico escolar.", "error");
      }
    } finally {
      setImporting(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="import-panel">
      <div>
        <p className="import-panel__title">Histórico escolar</p>
        <p className="import-panel__meta">Cria período, matéria e professor a partir de cada disciplina cursada no PDF.</p>
      </div>
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
      <Button variant="secondary" icon={FileCheck} loading={importing} onClick={() => inputRef.current?.click()}>
        {importing ? "Lendo PDF..." : "Importar histórico (PDF)"}
      </Button>
    </div>
  );
}
