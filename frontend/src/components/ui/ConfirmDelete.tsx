import { useState } from "react";
import { Trash2, Check, X } from "lucide-react";

export function ConfirmDelete({
  onConfirm,
  label = "Remover",
  confirmText = "Remover?",
}: {
  onConfirm: () => void;
  label?: string;
  confirmText?: string;
}) {
  const [confirming, setConfirming] = useState(false);

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
        onClick={() => {
          onConfirm();
          setConfirming(false);
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
