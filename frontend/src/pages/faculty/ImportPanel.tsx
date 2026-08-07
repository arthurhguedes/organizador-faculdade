import { useRef, useState } from "react";
import { Upload, RefreshCw } from "lucide-react";
import { parseOfferingsWorkbook } from "../../lib/offeringsImport";
import { Button } from "../../components/ui/Button";
import { useToast } from "../../context/ToastContext";

export function ImportPanel({
  lastImportedAt,
  importing,
  onImport,
}: {
  lastImportedAt: string | null;
  importing: boolean;
  onImport: (parsed: Awaited<ReturnType<typeof parseOfferingsWorkbook>>) => Promise<boolean>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [parsing, setParsing] = useState(false);
  const { notify } = useToast();

  const handleFile = async (file: File) => {
    setParsing(true);
    try {
      const parsed = await parseOfferingsWorkbook(file);
      if (parsed.length === 0) {
        notify("Não encontrei nenhuma linha reconhecível na planilha", "error");
        return;
      }
      await onImport(parsed);
    } catch {
      notify("Não consegui ler esse arquivo. Confira se é a planilha de encargos da faculdade.", "error");
    } finally {
      setParsing(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const busy = parsing || importing;

  return (
    <div className="import-panel">
      <div>
        <p className="import-panel__title">Catálogo de ofertas</p>
        <p className="import-panel__meta">
          {lastImportedAt
            ? `Última importação: ${new Date(lastImportedAt).toLocaleString("pt-BR")}`
            : "Nenhuma planilha importada ainda"}
        </p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
      <Button
        variant="secondary"
        icon={lastImportedAt ? RefreshCw : Upload}
        loading={busy}
        onClick={() => inputRef.current?.click()}
      >
        {busy ? "Processando..." : lastImportedAt ? "Reimportar planilha" : "Importar planilha"}
      </Button>
    </div>
  );
}
