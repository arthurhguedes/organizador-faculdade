import { Fragment, useState } from "react";
import { FileText, Plus, X, ChevronDown, ChevronUp } from "lucide-react";
import { usePageTitle } from "../context/PageTitleContext";
import { academicRequestsApi, subjectsApi } from "../api/client";
import { useEntityList } from "../hooks/useEntityList";
import { formatDate, todayISO } from "../lib/grades";
import type { AcademicRequest, AcademicRequestStatus, AcademicRequestType } from "../api/types";
import { PageHeader } from "../components/ui/PageHeader";
import { EmptyState } from "../components/ui/EmptyState";
import { SkeletonRows } from "../components/ui/Skeleton";
import { Button } from "../components/ui/Button";
import { Field } from "../components/ui/Field";
import { ConfirmDelete } from "../components/ui/ConfirmDelete";
import { ErrorBanner } from "../components/ui/ErrorBanner";

const TYPE_LABELS: Record<AcademicRequestType, string> = {
  prerequisite_waiver: "Quebra de pré-requisito",
  enrollment_adjustment: "Ajuste de matrícula",
  leave_of_absence: "Trancamento",
  credit_recognition: "Aproveitamento de disciplina",
};

const STATUS_LABELS: Record<AcademicRequestStatus, string> = {
  pendente: "Pendente",
  aprovado: "Aprovado",
  recusado: "Recusado",
};

const STATUS_TONES: Record<AcademicRequestStatus, "muted" | "accent" | "danger"> = {
  pendente: "muted",
  aprovado: "accent",
  recusado: "danger",
};

export function AcademicRequests() {
  usePageTitle("Requerimentos");
  const { items, loading, error, create, update, remove } = useEntityList(academicRequestsApi);
  const { items: subjects } = useEntityList(subjectsApi);

  const [formOpen, setFormOpen] = useState(false);
  const [type, setType] = useState<AcademicRequestType>("prerequisite_waiver");
  const [subjectId, setSubjectId] = useState("");
  const [submittedAt, setSubmittedAt] = useState(todayISO());
  const [requirements, setRequirements] = useState("");

  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [rejectionDraft, setRejectionDraft] = useState("");

  const subjectName = (id: number | null) => (id === null ? null : subjects.find((s) => s.id === id)?.name ?? "—");

  const sorted = [...items].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!type || !submittedAt) return;
    const ok = await create(
      {
        type,
        subjectId: subjectId ? Number(subjectId) : null,
        requirements: requirements || null,
        status: "pendente",
        submittedAt,
        resolvedAt: null,
        rejectionReason: null,
      },
      "Requerimento registrado",
    );
    if (ok) {
      setType("prerequisite_waiver");
      setSubjectId("");
      setSubmittedAt(todayISO());
      setRequirements("");
      setFormOpen(false);
    }
  };

  const changeStatus = (item: AcademicRequest, next: AcademicRequestStatus) => {
    update(
      item.id,
      {
        ...item,
        status: next,
        resolvedAt: next === "pendente" ? null : (item.resolvedAt ?? todayISO()),
        rejectionReason: next === "recusado" ? item.rejectionReason : null,
      },
      "Status atualizado",
    );
    if (next === "recusado") {
      setExpandedId(item.id);
      setRejectionDraft(item.rejectionReason ?? "");
    }
  };

  const toggleExpanded = (item: AcademicRequest) => {
    if (expandedId === item.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(item.id);
    setRejectionDraft(item.rejectionReason ?? "");
  };

  const saveRejectionReason = (item: AcademicRequest) => {
    update(item.id, { ...item, rejectionReason: rejectionDraft || null }, "Motivo da recusa salvo");
  };

  return (
    <div>
      <PageHeader
        title="Requerimentos"
        description="Pedidos formais feitos à faculdade — quebra de pré-requisito, ajuste de matrícula, trancamento, aproveitamento de disciplina — e o que cada um precisa pra ser aprovado."
        action={
          <Button variant="primary" icon={formOpen ? X : Plus} onClick={() => setFormOpen((v) => !v)}>
            {formOpen ? "Cancelar" : "Novo requerimento"}
          </Button>
        }
      />

      {error && <ErrorBanner message={error} />}

      {formOpen && (
        <form className="inline-form inline-form--stack" onSubmit={handleSubmit}>
          <label className="field">
            <span className="field__label">Tipo</span>
            <select className="field__input" value={type} onChange={(e) => setType(e.target.value as AcademicRequestType)}>
              {Object.entries(TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="field__label">Matéria (opcional)</span>
            <select className="field__input" value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
              <option value="">Nenhuma</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <Field
            label="Protocolado em"
            type="date"
            value={submittedAt}
            onChange={(e) => setSubmittedAt(e.target.value)}
            required
          />
          <label className="field">
            <span className="field__label">O que precisa pra dar certo (opcional)</span>
            <textarea
              className="field__input"
              rows={3}
              placeholder="Ex: assinatura do coordenador, comprovar reprovação por nota (não por falta), anexar histórico..."
              value={requirements}
              onChange={(e) => setRequirements(e.target.value)}
            />
          </label>
          <Button type="submit" variant="primary">
            Salvar
          </Button>
        </form>
      )}

      {loading ? (
        <SkeletonRows rows={4} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Nenhum requerimento registrado ainda"
          description="Registre pedidos como quebra de pré-requisito ou ajuste de matrícula pra acompanhar o status e o que falta pra aprovar."
        />
      ) : (
        <table className="eval-table">
          <thead>
            <tr>
              <th>Tipo</th>
              <th>Matéria</th>
              <th>Protocolado em</th>
              <th>Status</th>
              <th>Resolvido em</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {sorted.map((item) => (
              <Fragment key={item.id}>
                <tr>
                  <td>{TYPE_LABELS[item.type]}</td>
                  <td>{subjectName(item.subjectId) ?? "—"}</td>
                  <td>{formatDate(item.submittedAt)}</td>
                  <td>
                    <select
                      className={`field__input status-select status-select--${STATUS_TONES[item.status]}`}
                      value={item.status}
                      onChange={(e) => changeStatus(item, e.target.value as AcademicRequestStatus)}
                    >
                      {Object.entries(STATUS_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>{item.resolvedAt ? formatDate(item.resolvedAt) : "—"}</td>
                  <td className="eval-table__actions">
                    <button
                      type="button"
                      className="icon-btn"
                      onClick={() => toggleExpanded(item)}
                      aria-label="Ver detalhes"
                      title="Ver detalhes"
                    >
                      {expandedId === item.id ? <ChevronUp size={15} strokeWidth={2} /> : <ChevronDown size={15} strokeWidth={2} />}
                    </button>
                    <ConfirmDelete onConfirm={() => remove(item.id, "Requerimento removido")} label="Remover requerimento" />
                  </td>
                </tr>
                {expandedId === item.id && (
                  <tr>
                    <td colSpan={6}>
                      <div className="request-detail">
                        <div className="request-detail__block">
                          <span className="field__label">O que precisa pra dar certo</span>
                          <p>{item.requirements || "Nada anotado ainda."}</p>
                        </div>
                        {item.status === "recusado" && (
                          <label className="field">
                            <span className="field__label">Motivo da recusa</span>
                            <textarea
                              className="field__input"
                              rows={2}
                              value={rejectionDraft}
                              onChange={(e) => setRejectionDraft(e.target.value)}
                              onBlur={() => saveRejectionReason(item)}
                            />
                          </label>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
