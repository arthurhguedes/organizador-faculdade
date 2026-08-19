import { useRef, useState } from "react";
import { Upload, RefreshCw } from "lucide-react";
import {
  applyInstitutionMapping,
  parseOfferingsRows,
  readOfferingsSheet,
  recallInstitutionMapping,
  recallOfferingsMapping,
  rememberInstitutionMapping,
  rememberOfferingsMapping,
  suggestOfferingsMapping,
  type ColumnMapping,
  type ParsedOffering,
  type RawOfferingsSheet,
} from "../../lib/offeringsImport";
import { Button } from "../../components/ui/Button";
import { useToast } from "../../context/ToastContext";
import { useAuth } from "../../context/AuthContext";
import { OfferingsMappingPanel } from "./OfferingsMappingPanel";

export function ImportPanel({
  lastImportedAt,
  importing,
  onImport,
}: {
  lastImportedAt: string | null;
  importing: boolean;
  onImport: (parsed: ParsedOffering[]) => Promise<boolean>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [parsing, setParsing] = useState(false);
  const [pendingSheet, setPendingSheet] = useState<{
    sheet: RawOfferingsSheet;
    mapping: ColumnMapping;
    fromInstitution: boolean;
  } | null>(null);
  const { notify } = useToast();
  const { user } = useAuth();

  const runImport = async (sheet: RawOfferingsSheet, mapping: ColumnMapping) => {
    const parsed = parseOfferingsRows(sheet.rows, mapping);
    if (parsed.length === 0) {
      notify("Não encontrei nenhuma linha reconhecível com esse mapeamento de colunas", "error");
      return;
    }
    const ok = await onImport(parsed);
    if (ok) {
      rememberOfferingsMapping(sheet.headers, mapping);
      if (user) rememberInstitutionMapping(user.id, user.institution, mapping);
    }
  };

  const handleFile = async (file: File) => {
    setParsing(true);
    try {
      const sheet = await readOfferingsSheet(file);
      if (sheet.rows.length === 0) {
        notify("Não encontrei nenhuma linha nessa planilha", "error");
        return;
      }

      const remembered = recallOfferingsMapping(sheet.headers);
      if (remembered && parseOfferingsRows(sheet.rows, remembered).length > 0) {
        await runImport(sheet, remembered);
        return;
      }

      const institutionMapping = user ? recallInstitutionMapping(user.id, user.institution) : null;
      const fromInstitution = institutionMapping ? applyInstitutionMapping(sheet.headers, institutionMapping) : {};
      const hasInstitutionHints = Object.keys(fromInstitution).length > 0;
      const mapping = { ...suggestOfferingsMapping(sheet.headers), ...fromInstitution };

      setPendingSheet({ sheet, mapping, fromInstitution: hasInstitutionHints });
    } catch {
      notify("Não consegui ler esse arquivo. Confira se é uma planilha de oferta de disciplinas (.xlsx, .xls ou .csv).", "error");
    } finally {
      setParsing(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const busy = parsing || importing;

  if (pendingSheet) {
    return (
      <OfferingsMappingPanel
        sheet={pendingSheet.sheet}
        initialMapping={pendingSheet.mapping}
        institutionHint={pendingSheet.fromInstitution ? user?.institution ?? null : null}
        busy={importing}
        onCancel={() => setPendingSheet(null)}
        onConfirm={async (mapping) => {
          await runImport(pendingSheet.sheet, mapping);
          setPendingSheet(null);
        }}
      />
    );
  }

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
        accept=".xlsx,.xls,.csv"
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
