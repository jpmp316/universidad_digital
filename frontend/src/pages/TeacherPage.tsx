import { BookOpen, ClipboardCheck, GraduationCap, RefreshCw, Users } from "lucide-react";
import { useState, type FormEvent } from "react";

import type { Grade } from "../api/types";
import { Alert } from "../components/Alert";
import { Button } from "../components/Button";
import { Field } from "../components/Field";
import { EmptyState, LoadingState } from "../components/LoadingState";
import { StatusBadge } from "../components/StatusBadge";
import { useEnrollments } from "../hooks/useEnrollments";
import { useGrades } from "../hooks/useGrades";
import { usePeriods } from "../hooks/usePeriods";
import { useSubjects } from "../hooks/useSubjects";
import { formatGradeValue } from "../services/validation";

export function TeacherPage() {
  const { subjects, isLoading: subjectsLoading } = useSubjects();
  const { periods } = usePeriods();
  const { enrollments, isLoading: enrollmentsLoading, error: enrollmentsError, reload: reloadEnrollments } = useEnrollments();
  const [subjectId, setSubjectId] = useState("");
  const [periodId, setPeriodId] = useState("");
  const [studentSearch, setStudentSearch] = useState("");
  const [selectedEnrollmentId, setSelectedEnrollmentId] = useState("");
  const { grades, isLoading: gradesLoading, error: gradesError, create: createGrade, update: updateGrade, reload: reloadGrades } = useGrades(selectedEnrollmentId);
  const [assessmentName, setAssessmentName] = useState("");
  const [value, setValue] = useState("");
  const [editingGradeId, setEditingGradeId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const availableSubjects = subjects.filter((subject) => enrollments.some((enrollment) => enrollment.subject_id === subject.id));
  const filteredEnrollments = enrollments.filter((enrollment) =>
    (!subjectId || enrollment.subject_id === subjectId) && (!periodId || enrollment.period_id === periodId),
  );
  const visibleEnrollments = filteredEnrollments.filter((enrollment) => {
    const query = studentSearch.trim().toLocaleLowerCase();
    return !query || enrollment.student_name.toLocaleLowerCase().includes(query) || enrollment.id.toLocaleLowerCase().includes(query);
  });
  const availablePeriods = periods.filter((period) =>
    !subjectId || enrollments.some((enrollment) => enrollment.subject_id === subjectId && enrollment.period_id === period.id),
  );
  const selectedEnrollment = enrollments.find((enrollment) => enrollment.id === selectedEnrollmentId);
  const selectedSubject = selectedEnrollment && subjects.find((subject) => subject.id === selectedEnrollment.subject_id);
  const selectedPeriod = selectedEnrollment && periods.find((period) => period.id === selectedEnrollment.period_id);
  const activeGradeCount = grades.filter((grade) => grade.is_active).length;
  const error = enrollmentsError ?? gradesError ?? formError;

  const selectSubject = (nextSubjectId: string) => {
    setSubjectId(nextSubjectId);
    setPeriodId("");
    setSelectedEnrollmentId("");
    clearGradeForm();
  };

  const selectPeriod = (nextPeriodId: string) => {
    setPeriodId(nextPeriodId);
    setSelectedEnrollmentId("");
    clearGradeForm();
  };

  const selectEnrollment = (enrollmentId: string) => {
    setSelectedEnrollmentId(enrollmentId);
    clearGradeForm();
  };

  function clearGradeForm() {
    setAssessmentName("");
    setValue("");
    setEditingGradeId(null);
    setFormError(null);
  }

  const submitGrade = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const numericValue = Number(value);
    if (!selectedEnrollment || (!editingGradeId && !assessmentName.trim()) || value.trim() === "" || !Number.isFinite(numericValue) || numericValue < 0 || numericValue > 100) {
      setFormError("Selecciona un estudiante y escribe una nota entre 0 y 100.");
      return;
    }
    setIsSubmitting(true);
    setFormError(null);
    try {
      if (editingGradeId) await updateGrade(editingGradeId, numericValue);
      else await createGrade({ enrollment_id: selectedEnrollment.id, assessment_name: assessmentName.trim(), value: numericValue });
      clearGradeForm();
    } catch {
      setFormError("No se pudo guardar la nota. Revisa el mensaje y vuelve a intentarlo.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const editGrade = (grade: Grade) => {
    setEditingGradeId(grade.id);
    setAssessmentName(grade.assessment_name);
    setValue(String(grade.value));
    setFormError(null);
  };

  return (
    <div className="content-page">
      <div className="page-intro">
        <div><span className="eyebrow">Espacio docente</span><h2>Calificaciones</h2><p>Elige una asignatura y un periodo para revisar su lista de estudiantes.</p></div>
        <Button onClick={() => { void reloadEnrollments(); if (selectedEnrollmentId) void reloadGrades(); }} variant="secondary"><RefreshCw size={16} />Actualizar</Button>
      </div>
      {error ? <Alert message={error} /> : null}

      <section className="panel teacher-course-picker">
        <div className="panel-heading"><div><span className="eyebrow">Paso 1 · contexto del curso</span><h3>¿Qué grupo vas a calificar?</h3></div><div className="panel-heading-icon"><BookOpen size={20} /></div></div>
        {subjectsLoading || enrollmentsLoading ? <LoadingState label="Cargando asignaturas y grupos" /> : availableSubjects.length === 0 ? <EmptyState description="Cuando tengas estudiantes inscritos en tus asignaturas, aparecerán aquí." title="No hay grupos asignados" /> : <div className="course-filter-grid">
          <Field as="select" id="teacher-subject" label="Asignatura" value={subjectId} onChange={(event) => selectSubject(event.target.value)}>
            <option value="">Todas tus asignaturas</option>
            {availableSubjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.code} · {subject.name}</option>)}
          </Field>
          <Field as="select" id="teacher-period" label="Grupo / periodo académico" value={periodId} onChange={(event) => selectPeriod(event.target.value)}>
            <option value="">Todos los periodos</option>
            {availablePeriods.map((period) => <option key={period.id} value={period.id}>{period.name}</option>)}
          </Field>
          <div className="course-context-note"><strong>{visibleEnrollments.length}</strong><span>estudiantes visibles</span></div>
        </div>}
      </section>

      <div className="teacher-workspace">
        <section className="panel teacher-roster">
          <div className="panel-heading"><div><span className="eyebrow">Paso 2 · grupo</span><h3>Estudiantes</h3><p className="panel-copy">Selecciona una persona para consultar o registrar sus notas.</p></div><Users className="heading-symbol" size={21} /></div>
          {subjectsLoading || enrollmentsLoading ? <LoadingState label="Cargando estudiantes" /> : filteredEnrollments.length === 0 ? <EmptyState description="Prueba otra asignatura o periodo para encontrar inscripciones." title="No hay estudiantes para mostrar" /> : <>
            <Field id="teacher-student-search" label="Buscar estudiante o inscripción" placeholder="Escribe un nombre o código corto" type="search" value={studentSearch} onChange={(event) => setStudentSearch(event.target.value)} />
            {visibleEnrollments.length === 0 ? <EmptyState description="Prueba con otro nombre o número de inscripción." title="No hay coincidencias" /> : <div className="roster-list">
            {visibleEnrollments.map((enrollment) => {
              const subject = subjects.find((item) => item.id === enrollment.subject_id);
              const period = periods.find((item) => item.id === enrollment.period_id);
              return <button aria-pressed={selectedEnrollmentId === enrollment.id} className={`roster-item ${selectedEnrollmentId === enrollment.id ? "roster-item-selected" : ""}`} key={enrollment.id} onClick={() => selectEnrollment(enrollment.id)} type="button">
                <span className="roster-avatar" aria-hidden="true">{enrollment.student_name.trim().charAt(0).toLocaleUpperCase()}</span>
                <span className="roster-student"><strong>{enrollment.student_name}</strong><small>{subject?.code ?? "Asignatura"} · {period?.name ?? "Periodo"}</small><small>Inscripción {enrollment.id.slice(0, 8)}…</small></span>
                <StatusBadge status={enrollment.status} />
              </button>;
            })}
          </div>}
          </>}
        </section>

        <section className="panel teacher-grade-workspace">
          {!selectedEnrollment ? <EmptyState description="Selecciona un estudiante de la lista para ver las evaluaciones asociadas a su inscripción." title="Elige un estudiante" /> : <>
            <div className="grade-context">
              <span className="eyebrow">Paso 3 · estudiante e inscripción</span>
              <h3>{selectedEnrollment.student_name}</h3>
              <div className="grade-context-details"><span><BookOpen size={15} />{selectedSubject?.code ?? "Asignatura"} · {selectedSubject?.name ?? "No disponible"}</span><span><GraduationCap size={15} />Grupo / periodo: {selectedPeriod?.name ?? "No disponible"}</span><span>Inscripción {selectedEnrollment.id.slice(0, 8)}…</span><StatusBadge status={selectedEnrollment.status} /></div>
            </div>
            {selectedEnrollment.status === "cancelled" ? <Alert message="Esta inscripción está cancelada. Puedes consultar sus calificaciones, pero no registrar nuevas notas." tone="info" /> : null}
            <div className="grade-editor">
              <div className="panel-heading"><div><span className="eyebrow">Paso 4 · evaluación</span><h4>{editingGradeId ? `Editar ${assessmentName}` : "Registrar una nota"}</h4></div><ClipboardCheck className="heading-symbol" size={20} /></div>
              <form className="stack-form" onSubmit={submitGrade}>
                {editingGradeId ? <div className="field"><span className="field-label">Evaluación seleccionada</span><strong>{assessmentName}</strong></div> : <Field id="teacher-assessment" label="Nombre de la evaluación" placeholder="Ej. Parcial 1" value={assessmentName} onChange={(event) => setAssessmentName(event.target.value)} />}
                <Field id="teacher-grade-value" label="Calificación (0 a 100)" type="number" min="0" max="100" step="0.01" placeholder="0.00" value={value} onChange={(event) => setValue(event.target.value)} />
                <div className="grade-form-actions"><Button disabled={selectedEnrollment.status === "cancelled"} isLoading={isSubmitting} type="submit">{editingGradeId ? "Guardar cambio" : "Registrar calificación"}</Button>{editingGradeId ? <Button disabled={isSubmitting} onClick={clearGradeForm} type="button" variant="ghost">Salir de edición</Button> : null}</div>
              </form>
            </div>
            <div className="existing-grades">
              <div className="panel-heading"><div><span className="eyebrow">Notas de esta inscripción</span><h4>Evaluaciones registradas</h4></div><span className="grade-count">{activeGradeCount}</span></div>
              {gradesLoading ? <LoadingState label="Cargando calificaciones" /> : grades.length === 0 ? <EmptyState description="Las evaluaciones que registres aparecerán aquí." title="Todavía no hay notas" /> : <div className="grade-list">{grades.map((grade) => <div className="grade-row grade-row-editable" key={grade.id}><div><strong>{grade.assessment_name}</strong><small>Registrada el {new Date(grade.graded_at).toLocaleDateString("es-CO")}</small></div><strong className="grade-value">{formatGradeValue(grade.value)}</strong><Button disabled={selectedEnrollment.status === "cancelled"} onClick={() => editGrade(grade)} variant="secondary">Editar nota</Button></div>)}</div>}
            </div>
          </>}
        </section>
      </div>
    </div>
  );
}
