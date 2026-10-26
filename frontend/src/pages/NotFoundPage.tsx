import { Compass } from "lucide-react";
import { Link } from "react-router-dom";

export function NotFoundPage() {
  return <main className="center-page"><div className="center-icon"><Compass size={28} /></div><span className="eyebrow">404 / Página no encontrada</span><h1>Este camino todavía no existe.</h1><p>Regresa al campus para continuar tu recorrido.</p><Link className="button button-primary" to="/dashboard">Ir al resumen</Link></main>;
}