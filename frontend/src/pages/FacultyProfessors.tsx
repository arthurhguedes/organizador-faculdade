import { FileSpreadsheet } from "lucide-react";
import { usePageTitle } from "../context/PageTitleContext";
import { useOfferings } from "../hooks/useOfferings";
import { useGradeBuilder } from "../context/GradeBuilderContext";
import { PageHeader } from "../components/ui/PageHeader";
import { ErrorBanner } from "../components/ui/ErrorBanner";
import { EmptyState } from "../components/ui/EmptyState";
import { SkeletonRows } from "../components/ui/Skeleton";
import { ImportPanel } from "./faculty/ImportPanel";
import { OfferingsBrowser } from "./faculty/OfferingsBrowser";
import { GradeBuilderPanel } from "./faculty/GradeBuilderPanel";

export function FacultyProfessors() {
  usePageTitle("Professores da Faculdade");
  const { offerings, loading, error, importing, importOfferings } = useOfferings();
  const { selectedIds, isSelected, toggle, clear } = useGradeBuilder();

  const lastImportedAt = offerings[0]?.importedAt ?? null;
  const selectedOfferings = offerings.filter((o) => selectedIds.has(o.id));

  return (
    <div>
      <PageHeader
        title="Professores da Faculdade"
        description="Catálogo de turmas ofertadas pela faculdade — busque por professor ou disciplina e monte sua grade sem conflito de horário."
      />

      {error && <ErrorBanner message={error} />}

      <ImportPanel lastImportedAt={lastImportedAt} importing={importing} onImport={importOfferings} />

      {loading ? (
        <SkeletonRows rows={5} />
      ) : offerings.length === 0 ? (
        <EmptyState
          icon={FileSpreadsheet}
          title="Nenhuma planilha importada ainda"
          description="Importe a planilha de encargos que a faculdade disponibiliza (professor, disciplina, turma e horários) pra começar a montar sua grade."
        />
      ) : (
        <div className="faculty-layout">
          <OfferingsBrowser offerings={offerings} isSelected={isSelected} onToggle={toggle} />
          <GradeBuilderPanel
            selectedOfferings={selectedOfferings}
            onRemove={toggle}
            onConfirmed={clear}
          />
        </div>
      )}
    </div>
  );
}
