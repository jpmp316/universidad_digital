import { BookOpen, Plus, RefreshCw } from "lucide-react";

import { Alert } from "../components/Alert";
import { Button } from "../components/Button";
import { EmptyState, LoadingState } from "../components/LoadingState";
import { useSubjects } from "../hooks/useSubjects";
import { useAuth } from "../hooks/useAuth";

export function SubjectsPage() {
  const { user } = useAuth();
  const { subjects, isLoading, error, reload } = useSubjects();
  const teacher = user?.role_names.includes("teacher");
  return (
    <div className="content-page">
      <div className="page-intro"><div><span className="eyebrow">Catálogo académico</span><h2>Materias</h2><p>{teacher ? "Tus materias asignadas para este periodo." : "Explora la oferta académica disponible."}</p></div><Button variant="secondary" onClick={() => void reload()}><RefreshCw size={16} />Actualizar</Button></div>
      {error ? <Alert message={error} /> : null}
      {isLoading ? <LoadingState /> : subjects.length === 0 ? <EmptyState title="No hay materias disponibles" description="El catálogo se actualizará cuando se publiquen nuevas materias." /> : <div className="subject-grid">{subjects.map((subject) => <article className="subject-card" key={subject.id}><div className="subject-card-top"><span className="subject-code">{subject.code}</span><span className={`availability ${subject.is_active ? "is-active" : ""}`}>{subject.is_active ? "Disponible" : "Inactiva"}</span></div><div className="subject-icon"><BookOpen size={21} /></div><h3>{subject.name}</h3><p>{subject.description || "Materia del plan académico."}</p><div className="subject-meta"><span>{subject.credits} créditos</span>{teacher ? <span>{subject.teacher_ids.length ? "Asignada" : "Sin asignación"}</span> : <span><Plus size={13} /> Ver programa</span>}</div></article>)}</div>}
    </div>
  );
}