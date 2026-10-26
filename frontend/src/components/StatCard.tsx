import type { ReactNode } from "react";

interface StatCardProps {
  label: string;
  value: string | number;
  detail: string;
  icon: ReactNode;
  accent?: "teal" | "coral" | "gold" | "ink";
}

export function StatCard({ label, value, detail, icon, accent = "teal" }: StatCardProps) {
  return (
    <article className={`stat-card stat-${accent}`}>
      <div className="stat-icon" aria-hidden="true">{icon}</div>
      <div>
        <span className="eyebrow">{label}</span>
        <strong>{value}</strong>
        <small>{detail}</small>
      </div>
    </article>
  );
}