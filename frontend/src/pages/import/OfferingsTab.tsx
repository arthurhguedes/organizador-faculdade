import { useOfferings } from "../../hooks/useOfferings";
import { useGradeBuilder } from "../../context/GradeBuilderContext";
import { ErrorBanner } from "../../components/ui/ErrorBanner";
import { ImportPanel } from "../faculty/ImportPanel";

export function OfferingsTab() {
  const { offerings, error, importing, importOfferings, clearOfferings } = useOfferings();
  const { clear: clearGradeSelection } = useGradeBuilder();
  const lastImportedAt = offerings[0]?.importedAt ?? null;

  // Limpar o catálogo invalida qualquer turma já selecionada em Montar Grade
  // (os ids de oferta deixam de existir) — sem isso a seleção fica com lixo.
  const handleClear = async () => {
    const ok = await clearOfferings();
    if (ok) clearGradeSelection();
    return ok;
  };

  return (
    <div>
      {error && <ErrorBanner message={error} />}
      <ImportPanel
        lastImportedAt={lastImportedAt}
        importing={importing}
        onImport={importOfferings}
        onClear={handleClear}
      />
    </div>
  );
}
