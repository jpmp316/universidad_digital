import type { ButtonHTMLAttributes, ReactNode } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  isLoading?: boolean;
}

export function Button({ children, variant = "primary", isLoading = false, disabled, ...props }: ButtonProps) {
  return (
    <button className={`button button-${variant}`} disabled={disabled || isLoading} {...props}>
      {isLoading ? <span className="button-loader" aria-hidden="true" /> : null}
      {children}
    </button>
  );
}