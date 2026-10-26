interface AlertProps {
  message: string;
  tone?: "error" | "success" | "info";
  onClose?: () => void;
}

export function Alert({ message, tone = "error", onClose }: AlertProps) {
  return (
    <div className={`alert alert-${tone}`} role={tone === "error" ? "alert" : "status"}>
      <span>{message}</span>
      {onClose ? <button className="alert-close" type="button" aria-label="Cerrar mensaje" onClick={onClose}>×</button> : null}
    </div>
  );
}