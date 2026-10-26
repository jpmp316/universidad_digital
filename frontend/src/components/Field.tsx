import type { InputHTMLAttributes, SelectHTMLAttributes } from "react";

interface BaseFieldProps {
  id: string;
  label: string;
  error?: string;
  hint?: string;
}

interface InputFieldProps extends BaseFieldProps, Omit<InputHTMLAttributes<HTMLInputElement>, "id"> {
  as?: "input";
}

interface SelectFieldProps extends BaseFieldProps, Omit<SelectHTMLAttributes<HTMLSelectElement>, "id"> {
  as: "select";
  children: React.ReactNode;
}

export function Field({ id, label, error, hint, as = "input", ...props }: InputFieldProps | SelectFieldProps) {
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {as === "select" ? (
        <select id={id} aria-invalid={Boolean(error)} aria-describedby={describedBy} {...(props as SelectHTMLAttributes<HTMLSelectElement>)} />
      ) : (
        <input id={id} aria-invalid={Boolean(error)} aria-describedby={describedBy} {...(props as InputHTMLAttributes<HTMLInputElement>)} />
      )}
      {hint && !error ? <span id={`${id}-hint`} className="field-hint">{hint}</span> : null}
      {error ? <span id={`${id}-error`} className="field-error" role="alert">{error}</span> : null}
    </div>
  );
}