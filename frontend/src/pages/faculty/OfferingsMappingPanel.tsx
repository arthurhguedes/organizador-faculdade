import { useMemo, useState } from "react";
import { Check, X } from "lucide-react";
import { Button } from "../../components/ui/Button";
import {
  OFFERING_FIELD_LABELS,
  parseOfferingsRows,
  type ColumnMapping,
  type OfferingField,
  type RawOfferingsSheet,
} from "../../lib/offeringsImport";

const OFFERING_FIELD_GROUPS: { title: string; fields: OfferingField[] }[] = [
  {
    title: "Dados da turma",
    fields: [
      "subjectCode",
      "subjectName",
      "professorName",
      "turma",
      "curso",
      "vagas",
      "depto",
      "workloadHours",
      "theoryHours",
      "practiceHours",
    ],
  },
  {
    title: "Horários por dia da semana",
    fields: ["segunda", "terça", "quarta", "quinta", "sexta", "sábado"],
  },
];

const REQUIRED_FIELDS: OfferingField[] = ["subjectCode", "subjectName"];

export function OfferingsMappingPanel({
  sheet,
  initialMapping,
  institutionHint,
  busy,
  onConfirm,
  onCancel,
}: {
  sheet: RawOfferingsSheet;
  initialMapping: ColumnMapping;
  institutionHint?: string | null;
  busy: boolean;
  onConfirm: (mapping: ColumnMapping) => void;
  onCancel: () => void;
}) {
  const [mapping, setMapping] = useState<ColumnMapping>(initialMapping);

  const setField = (field: OfferingField, header: string) => {
    setMapping((prev) => ({ ...prev, [field]: header || undefined }));
  };

  const preview = useMemo(() => parseOfferingsRows(sheet.rows, mapping), [sheet.rows, mapping]);
  const missingRequired = REQUIRED_FIELDS.filter((field) => !mapping[field]);
  const canConfirm = missingRequired.length === 0 && preview.length > 0;

  return (
    <div className="offerings-mapping">
      <div className="offerings-mapping__header">
        <p className="import-panel__title">Confira as colunas da sua planilha</p>
        <p className="import-panel__meta">
          Cada faculdade organiza a planilha de um jeito — associe cada campo à coluna correspondente. A gente
          lembra dessa escolha pras próximas importações dessa mesma planilha.
        </p>
        {institutionHint && (
          <p className="offerings-mapping__institution-hint">
            Pré-preenchido com o mapeamento que você já confirmou pra {institutionHint} — confira antes de importar.
          </p>
        )}
      </div>

      {OFFERING_FIELD_GROUPS.map((group) => (
        <div key={group.title} className="offerings-mapping__group">
          <p className="offerings-mapping__group-title">{group.title}</p>
          <div className="offerings-mapping__fields">
            {group.fields.map((field) => (
              <label key={field} className="field offerings-mapping__field">
                <span className="field__label">
                  {OFFERING_FIELD_LABELS[field]}
                  {REQUIRED_FIELDS.includes(field) ? " *" : ""}
                </span>
                <select
                  className="field__input"
                  value={mapping[field] ?? ""}
                  onChange={(e) => setField(field, e.target.value)}
                >
                  <option value="">Não usar</option>
                  {sheet.headers.map((header) => (
                    <option key={header} value={header}>
                      {header}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
        </div>
      ))}

      <div className="offerings-mapping__preview">
        {preview.length > 0 ? (
          <>
            <p className="offerings-mapping__preview-title">
              {preview.length} turma{preview.length !== 1 ? "s" : ""} reconhecida{preview.length !== 1 ? "s" : ""}{" "}
              de {sheet.rows.length} linha{sheet.rows.length !== 1 ? "s" : ""} na planilha
            </p>
            <div className="offerings-mapping__preview-table-wrap">
              <table className="offerings-mapping__preview-table">
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Disciplina</th>
                    <th>Professor(a)</th>
                    <th>Turma</th>
                    <th>Horários</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.slice(0, 5).map((offering, i) => (
                    <tr key={i}>
                      <td>{offering.subjectCode}</td>
                      <td>{offering.subjectName}</td>
                      <td>{offering.professorName ?? "—"}</td>
                      <td>{offering.turma}</td>
                      <td>{offering.schedules.length > 0 ? `${offering.schedules.length} horário(s)` : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <p className="offerings-mapping__preview-empty">
            {missingRequired.length > 0
              ? "Associe pelo menos o código e o nome da disciplina pra ver a prévia."
              : "Nenhuma linha reconhecível com esse mapeamento — confira as colunas escolhidas."}
          </p>
        )}
      </div>

      <div className="offerings-mapping__actions">
        <Button variant="ghost" icon={X} onClick={onCancel} disabled={busy}>
          Cancelar
        </Button>
        <Button
          variant="primary"
          icon={Check}
          loading={busy}
          disabled={!canConfirm}
          onClick={() => onConfirm(mapping)}
        >
          Confirmar importação
        </Button>
      </div>
    </div>
  );
}
