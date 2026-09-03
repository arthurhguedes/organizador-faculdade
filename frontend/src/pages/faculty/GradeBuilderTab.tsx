import { FileSpreadsheet } from "lucide-react";
import { Link } from "react-router-dom";
import { useOfferings } from "../../hooks/useOfferings";
import { useGradeBuilder } from "../../context/GradeBuilderContext";
import { PageHeader } from "../../components/ui/PageHeader";
import { ErrorBanner } from "../../components/ui/ErrorBanner";
import { EmptyState } from "../../components/ui/EmptyState";
import { SkeletonRows } from "../../components/ui/Skeleton";
import { OfferingsBrowser } from "./OfferingsBrowser";
import { GradeBuilderPanel } from "./GradeBuilderPanel";
import { EnrollmentImportButton } from "./EnrollmentImportButton";

export function GradeBuilderTab() {
  const { offerings, loading, error } = useOfferings();
  const { selectedIds, isSelected, toggle, clear } = useGradeBuilder();

  const selectedOfferings = offerings.filter((o) => selectedIds.has(o.id));

  return (
    <div>
      <PageHeader description="Catálogo de turmas ofertadas pela faculdade — busque por professor ou disciplina e monte sua grade sem conflito de horário." />

      {error && <ErrorBanner message={error} />}

      {loading ? (
        <SkeletonRows rows={5} />
      ) : offerings.length === 0 ? (
        <EmptyState
          icon={FileSpreadsheet}
          title="Nenhuma planilha importada ainda"
          description={
            <>
              Importe a planilha de encargos que a faculdade disponibiliza na aba{" "}
              <Link to="/importar">Importar</Link> pra começar a montar sua grade.
            </>
          }
        />
      ) : (
        <div className="faculty-layout">
          <div>
            <EnrollmentImportButton offerings={offerings} />
            <OfferingsBrowser offerings={offerings} isSelected={isSelected} onToggle={toggle} />
          </div>
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
