import { ArrowRight, BookOpen, CheckCircle2, LockKeyhole } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { Alert } from "../components/Alert";
import { Button } from "../components/Button";
import { Field } from "../components/Field";
import { useAuth } from "../hooks/useAuth";
import { validateEmail, validatePassword, validateRequired } from "../services/validation";

export function LoginPage() {
  const { user, isLoading, error: authError, login, register, clearError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user && !isLoading) navigate("/dashboard", { replace: true });
  }, [isLoading, navigate, user]);

  if (user && !isLoading) return null;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    clearError();
    setFormError(null);
    setSuccess(null);
    const emailError = validateEmail(email);
    const passwordError = mode === "register" ? validatePassword(password) : validateRequired(password, "La contraseña");
    const nameError = mode === "register" ? validateRequired(fullName, "El nombre") : undefined;
    if (emailError || passwordError || nameError) {
      setFormError(emailError ?? passwordError ?? nameError ?? "Revisa los campos.");
      return;
    }
    setIsSubmitting(true);
    try {
      if (mode === "login") {
        await login(email, password);
        const from = (location.state as { from?: string } | null)?.from ?? "/dashboard";
        navigate(from, { replace: true });
      } else {
        await register(email, fullName, password);
        setMode("login");
        setPassword("");
        setSuccess("Cuenta creada. Ya puedes iniciar sesión.");
      }
    } catch {
      // AuthContext exposes a safe, user-facing error.
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-aside" aria-label="Universidad Digital">
        <div className="brand brand-light"><span className="brand-glyph">UD</span><span>Universidad<br /><b>Digital</b></span></div>
        <div className="auth-hero-copy">
          <span className="auth-overline">Campus académico</span>
          <h1>Aprender deja una huella.</h1>
          <p>Un espacio claro para seguir tu recorrido universitario, materia a materia.</p>
        </div>
        <div className="auth-aside-footer"><span><CheckCircle2 size={16} /> Datos siempre bajo control</span><span><BookOpen size={16} /> Tu avance, en un solo lugar</span></div>
      </section>
      <section className="auth-panel">
        <div className="auth-panel-inner">
          <div className="mobile-brand brand"><span className="brand-glyph">UD</span><span>Universidad <b>Digital</b></span></div>
          <div className="auth-heading"><span className="eyebrow">{mode === "login" ? "Bienvenido de vuelta" : "Nuevo acceso"}</span><h2>{mode === "login" ? "Entrar al campus" : "Crear cuenta"}</h2><p>{mode === "login" ? "Continúa donde lo dejaste." : "Regístrate como estudiante en unos pasos."}</p></div>
          {authError ? <Alert message={authError} onClose={clearError} /> : null}
          {formError ? <Alert message={formError} /> : null}
          {success ? <Alert message={success} tone="success" /> : null}
          <form className="auth-form" onSubmit={submit} noValidate>
            {mode === "register" ? <Field id="full-name" label="Nombre completo" value={fullName} onChange={(event) => setFullName(event.target.value)} autoComplete="name" placeholder="Ana Estudiante" /> : null}
            <Field id="email" label="Correo institucional" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" placeholder="nombre@universidad.edu" />
            <Field id="password" label="Contraseña" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={mode === "login" ? "current-password" : "new-password"} placeholder="••••••••••••" />
            <Button type="submit" className="auth-submit" isLoading={isSubmitting}>{mode === "login" ? "Entrar al campus" : "Crear cuenta"}<ArrowRight size={18} /></Button>
          </form>
          <div className="auth-switch">{mode === "login" ? "¿Aún no tienes una cuenta?" : "¿Ya tienes una cuenta?"}<button type="button" onClick={() => { setMode(mode === "login" ? "register" : "login"); setFormError(null); clearError(); }}>{mode === "login" ? "Regístrate" : "Inicia sesión"}</button></div>
          <div className="secure-note"><LockKeyhole size={15} /><span>Conexión protegida. Tu sesión nunca se guarda en el navegador.</span></div>
        </div>
      </section>
    </main>
  );
}