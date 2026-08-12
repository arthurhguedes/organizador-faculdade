import { useState } from "react";
import { Trash2, Check, X, Loader2 } from "lucide-react";

export function ConfirmDelete({
  onConfirm,
  label = "Remover",
  confirmText = "Remover?",
  deletingText = "Excluindo...",
}: {
  onConfirm: () => void | Promise<unknown>;
  label?: string;
  confirmText?: string;
  deletingText?: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (deleting) {
    return (
      <span className="confirm-delete confirm-delete--pending">
        <Loader2 size={15} strokeWidth={2} className="spin" />
        <span>{deletingText}</span>
      </span>
    );
  }

  if (!confirming) {
    return (
      <button
        type="button"
        className="icon-btn icon-btn--danger"
        onClick={() => setConfirming(true)}
        aria-label={label}
        title={label}
      >
        <Trash2 size={15} strokeWidth={2} />
      </button>
    );
  }

  return (
    <span className="confirm-delete">
      <span>{confirmText}</span>
      <button
        type="button"
        className="icon-btn icon-btn--danger"
        onClick={async () => {
          setDeleting(true);
          try {
            await onConfirm();
          } finally {
            setDeleting(false);
            setConfirming(false);
          }
        }}
        aria-label="Confirmar remoção"
      >
        <Check size={15} strokeWidth={2} />
      </button>
      <button
        type="button"
        className="icon-btn"
        onClick={() => setConfirming(false)}
        aria-label="Cancelar remoção"
      >
        <X size={15} strokeWidth={2} />
      </button>
    </span>
  );
}
