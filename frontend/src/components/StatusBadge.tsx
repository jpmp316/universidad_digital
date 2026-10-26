export function StatusBadge({ status }: { status: string }) {
  const label = status === "active" ? "Activa" : status === "completed" ? "Completada" : status === "cancelled" ? "Cancelada" : status;
  return <span className={`status-badge status-${status}`}>{label}</span>;
}