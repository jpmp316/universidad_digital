import { useEffect } from "react";

import { Button } from "./Button";

interface ConfirmDialogProps {
  title: string;
  description: string;
  confirmLabel: string;
  isConfirming?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  title,
  description,
  confirmLabel,
  isConfirming = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isConfirming) onCancel();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isConfirming, onCancel]);

  return (
    <div className="dialog-backdrop">
      <section
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-description"
        aria-modal="true"
        className="confirm-dialog"
        role="alertdialog"
      >
        <span className="eyebrow">Confirma esta acción</span>
        <h2 id="confirm-dialog-title">{title}</h2>
        <p id="confirm-dialog-description">{description}</p>
        <div className="dialog-actions">
          <Button autoFocus disabled={isConfirming} onClick={onCancel} type="button" variant="secondary">
            Mantener inscripción
          </Button>
          <Button disabled={isConfirming} isLoading={isConfirming} onClick={onConfirm} type="button" variant="danger">
            {confirmLabel}
          </Button>
        </div>
      </section>
    </div>
  );
}
