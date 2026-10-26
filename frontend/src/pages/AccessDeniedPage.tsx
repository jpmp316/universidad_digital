import { ShieldX } from "lucide-react";
import { Link } from "react-router-dom";

export function AccessDeniedPage() {
  return <main className="center-page"><div className="center-icon"><ShieldX size={28} /></div><span className="eyebrow">403 / Acceso restringido</span><h1>Esta puerta no es para tu rol.</h1><p>Tu sesión sigue activa, pero no tienes permisos para consultar este espacio.</p><Link className="button button-primary" to="/dashboard">Volver al resumen</Link></main>;
}