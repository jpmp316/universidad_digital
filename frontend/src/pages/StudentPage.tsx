import { BookOpen, CheckCircle2, ClipboardList, GraduationCap, Plus, RefreshCw, TriangleAlert } from "lucide-react";
import { useState, type FormEvent } from "react";

import { reportsApi } from "../api/endpoints";
import type { Enrollment, StudentReport } from "../api/types";
import { Alert } from "../components/Alert";
import { Button } from "../components/Button";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { Field } from "../components/Field";
import { EmptyState, LoadingState } from "../components/LoadingState";
import { StatusBadge } from "../components/StatusBadge";
import { useAuth } from "../hooks/useAuth";
import { useEnrollments } from "../hooks/useEnrollments";
import { useGrades } from "../hooks/useGrades";
import { usePeriods } from "../hooks/usePeriods";
import { useSubjects } from "../hooks/useSubjects";
import { formatGradeValue } from "../services/validation";

export function StudentPage() {
  const { user } = useAuth();
  const { subjects } = useSubjects();
  const { periods } = usePeriods();
  const { enrollments, isLoading, error, create, cancel, reload } = useEnrollments();
  const [selectedEnrollmentId, setSelectedEnrollmentId] = useState<string>();
  const [pendingCancel, setPendingCancel] = useState<Enrollment | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const { grades, isLoading: gradesLoading } = useGrades(selectedEnrollmentId);
  const [report, setReport] = useState<StudentReport | null>(null);
  const [subjectId, setSubjectId] = useState("");
  const [periodId, setPeriodId] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const activeSubjects = subjects.filter((subject) => subject.is_active);
  const activePeriods = periods.filter((period) => period.is_active);
  const selected = enrollments.find((enrollment) => enrollment.id === selectedEnrollmentId);
  const selectedSubject = selected && subjects.find((subject) => subject.id === selected.subject_id);
  const selectedPeriod = selected && periods.find((period) => period.id === selected.period_id);

  const submitEnrollment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!subjectId || !periodId || !user) {
      setFormError("Selecciona una materia y un periodo académico.");
      return;
    }
    setIsSubmitting(true);
    setFormError(null);
    try {
      await create({ student_id: user.id, subject_id: subjectId, period_id: periodId });
      setSubjectId("");
      setPeriodId("");
    } catch {
      setFormError("No se pudo crear la inscripción. Revisa el mensaje de la lista y vuelve a intentarlo.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const loadReport = async () => {
    if (!user) return;
    setFormError(null);
    try {
      setReport((await reportsApi.student(user.id)).data);
    } catch {
      setFormError("No se pudo cargar el resumen académico. Inténtalo de nuevo.");
    }
  };

  const confirmCancel = async () => {
    if (!pendingCancel) return;
    setIsCancelling(true);
    try {
      await cancel(pendingCancel.id);
      setPendingCancel(null);
      if (report) await loadReport();
    } catch {
      // The enrollment hook exposes the API error in its error state.
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <div className="content-page">
      <div className="page-intro">
        <div><span className="eyebrow">Espacio del estudiante</span><h2>Mi avance</h2><p>Consulta tus materias, periodos y calificaciones desde un mismo lugar.</p></div>
        <Button onClick={() => void reload()} variant="secondary"><RefreshCw size={16} />Actualizar</Button>
      </div>
      {error ? <Alert message={error} /> : null}
      {formError ? <Alert message={formError} /> : null}

      <div className="student-grid">
        <section className="panel panel-highlight">
          <div className="panel-heading"><div><span className="eyebrow">Inscripción</span><h3>Explora una materia</h3></div><div className="panel-heading-icon"><Plus size={20} /></div></div>
          <p className="panel-copy">Elige primero la asignatura y el periodo académico al que quieres ingresar.</p>
          <form className="stack-form" onSubmit={submitEnrollment}>
            <Field as="select" id="student-subject" label="Materia" value={subjectId} onChange={(event) => setSubjectId(event.target.value)}>
              <option value="">Selecciona una materia</option>
              {activeSubjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.code} · {subject.name}</option>)}
            </Field>
            <Field as="select" id="student-period" label="Periodo académico" value={periodId} onChange={(event) => setPeriodId(event.target.value)}>
              <option value="">Selecciona un periodo</option>
              {activePeriods.map((period) => <option key={period.id} value={period.id}>{period.name}</option>)}
            </Field>
            <Button isLoading={isSubmitting} type="submit"><Plus size={16} />Inscribirme</Button>
          </form>
        </section>

        <section className="panel report-panel">
          <div className="panel-heading"><div><span className="eyebrow">Resumen académico</span><h3>Tu progreso</h3></div><div className="panel-heading-icon gold"><GraduationCap size={20} /></div></div>
          {report ? <>
            <div className="report-metrics"><div><strong>{report.total_enrollments}</strong><span>Inscripciones</span></div><div><strong>{report.total_grades}</strong><span>Calificaciones</span></div><div><strong>{report.average_grade == null ? "—" : formatGradeValue(report.average_grade)}</strong><span>Promedio</span></div></div>
            <Button onClick={() => void loadReport()} variant="ghost"><RefreshCw size={15} />Actualizar resumen</Button>
          </> : <><p className="panel-copy">Consulta el promedio de tus calificaciones y el estado general de tus inscripciones.</p><Button onClick={() => void loadReport()} variant="secondary">Ver mi resumen <GraduationCap size={16} /></Button></>}
        </section>
      </div>

      <section className="panel table-panel">
        <div className="panel-heading"><div><span className="eyebrow">Registro académico</span><h3>Mis inscripciones</h3><p className="panel-copy">Consulta las notas de una materia o revisa su estado.</p></div><ClipboardList className="heading-symbol" size={21} /></div>
        {isLoading ? <LoadingState label="Cargando tus inscripciones" /> : enrollments.length === 0 ? <EmptyState description="Cuando te inscribas en una materia, aparecerá aquí." title="Aún no tienes inscripciones" /> : (
          <div className="table-wrap"><table>
            <caption className="sr-only">Inscripciones del estudiante</caption>
            <thead><tr><th scope="col">Materia</th><th scope="col">Periodo</th><th scope="col">Estado</th><th scope="col">Consulta</th><th scope="col">Acción</th></tr></thead>
            <tbody>{enrollments.map((enrollment) => {
              const subject = subjects.find((item) => item.id === enrollment.subject_id);
              const period = periods.find((item) => item.id === enrollment.period_id);
              return <tr key={enrollment.id} className={selectedEnrollmentId === enrollment.id ? "selected-row" : ""}>
                <td><strong>{subject?.code ?? "Materia"}</strong><small className="table-secondary">{subject?.name ?? "Asignatura no disponible"}</small></td>
                <td>{period?.name ?? "Periodo no disponible"}</td>
                <td><StatusBadge status={enrollment.status} /></td>
                <td><Button onClick={() => setSelectedEnrollmentId(enrollment.id)} variant="ghost">{selectedEnrollmentId === enrollment.id ? "Viendo notas" : "Ver calificaciones"}</Button></td>
                <td>{enrollment.status === "active" ? <Button onClick={() => setPendingCancel(enrollment)} variant="danger"><TriangleAlert size={15} />Cancelar inscripción</Button> : <span className="muted-copy">Sin acciones</span>}</td>
              </tr>;
            })}</tbody>
          </table></div>
        )}
      </section>

      {selected ? <section className="panel grades-panel">
        <div className="panel-heading"><div><span className="eyebrow">{selectedSubject?.code ?? "Materia"} · {selectedPeriod?.name ?? "Periodo"}</span><h3>{selectedSubject?.name ?? "Calificaciones"}</h3><p className="panel-copy">Inscripción {selected.id.slice(0, 8)}…</p></div><StatusBadge status={selected.status} /></div>
        {gradesLoading ? <LoadingState label="Cargando calificaciones" /> : grades.length === 0 ? <EmptyState description="Cuando el docente registre una evaluación, aparecerá en esta lista." title="Sin calificaciones todavía" /> : <div className="grade-list">{grades.map((grade) => <div className="grade-row" key={grade.id}><div><strong>{grade.assessment_name}</strong><small>{new Date(grade.graded_at).toLocaleDateString("es-CO")}</small></div><strong className="grade-value">{formatGradeValue(grade.value)}</strong><CheckCircle2 aria-hidden="true" size={17} /></div>)}</div>}
      </section> : null}

      {pendingCancel ? <ConfirmDialog
        confirmLabel="Sí, cancelar inscripción"
        description={`Vas a cancelar tu inscripción en ${subjects.find((item) => item.id === pendingCancel.subject_id)?.name ?? "esta materia"} (${subjects.find((item) => item.id === pendingCancel.subject_id)?.code ?? "sin código"}), periodo ${periods.find((item) => item.id === pendingCancel.period_id)?.name ?? "no disponible"}. La inscripción quedará marcada como cancelada y sus calificaciones dejarán de contar en tu promedio. Esta acción conserva el historial y no se puede deshacer desde esta pantalla.`}
        isConfirming={isCancelling}
        onCancel={() => setPendingCancel(null)}
        onConfirm={() => void confirmCancel()}
        title="¿Cancelar esta inscripción?"
      /> : null}
    </div>
  );
}
