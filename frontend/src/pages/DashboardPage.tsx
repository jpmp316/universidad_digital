import { Activity, ArrowUpRight, BookOpen, GraduationCap, Users } from "lucide-react";
import { Link } from "react-router-dom";

import { Alert } from "../components/Alert";
import { LoadingState } from "../components/LoadingState";
import { StatCard } from "../components/StatCard";
import { useAuth } from "../hooks/useAuth";
import { useSubjects } from "../hooks/useSubjects";
import { useUsers } from "../hooks/useUsers";

export function DashboardPage() {
  const { user } = useAuth();
  const { subjects, isLoading: subjectsLoading, error: subjectsError } = useSubjects();
  const isAdmin = user?.role_names.includes("admin") ?? false;
  const { users } = useUsers(isAdmin);
  const isLoading = subjectsLoading;
  const error = subjectsError;

  return (
    <div className="dashboard-page">
      <section className="welcome-band">
        <div><span className="eyebrow">Lunes, 31 de agosto de 2026</span><h2>Hola, {user?.full_name.split(" ")[0]}.</h2><p>Este es el pulso de tu actividad en el campus.</p></div>
        <Link className="quick-action" to={isAdmin ? "/administration" : user?.role_names.includes("teacher") ? "/teaching" : "/academic"}>Abrir espacio de trabajo <ArrowUpRight size={17} /></Link>
      </section>
      {error ? <Alert message={error} /> : null}
      {isLoading ? <LoadingState /> : (
        <>
          <section className="stats-grid" aria-label="Indicadores principales">
            <StatCard label="Materias activas" value={subjects.filter((subject) => subject.is_active).length} detail="Disponibles en el campus" icon={<BookOpen size={22} />} accent="teal" />
            {isAdmin ? <StatCard label="Usuarios" value={users.length} detail="Perfiles registrados" icon={<Users size={22} />} accent="gold" /> : <StatCard label="Estado" value="En marcha" detail="Tu recorrido continúa" icon={<Activity size={22} />} accent="gold" />}
            <StatCard label="Siguiente paso" value={user?.role_names.includes("teacher") ? "Evaluar" : "Explorar"} detail="Acceso directo abajo" icon={<GraduationCap size={22} />} accent="ink" />
          </section>
        </>
      )}
    </div>
  );
}
