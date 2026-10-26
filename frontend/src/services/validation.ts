export function validateEmail(value: string): string | undefined {
  if (!value.trim()) return "El correo es obligatorio.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return "Escribe un correo válido.";
  return undefined;
}

export function validatePassword(value: string): string | undefined {
  if (value.length < 12) return "Usa al menos 12 caracteres.";
  if (!/[A-Z]/.test(value) || !/[a-z]/.test(value) || !/\d/.test(value)) {
    return "Incluye mayúscula, minúscula y un número.";
  }
  return undefined;
}

export function validateRequired(value: string, label: string): string | undefined {
  return value.trim() ? undefined : `${label} es obligatorio.`;
}

export function formatGradeValue(value: number | string): string {
  const numericValue = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numericValue) ? numericValue.toFixed(2) : "—";
}
