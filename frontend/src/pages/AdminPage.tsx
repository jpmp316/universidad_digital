import { BookOpen, CalendarDays, ClipboardList, GraduationCap, Plus, RefreshCw, Shield, UserPlus, Users } from "lucide-react";
import { useState, type FormEvent } from "react";

import type { Enrollment, Grade, Role, User } from "../api/types";
import { enrollmentsApi } from "../api/endpoints";
import { getApiErrorMessage } from "../api/client";
import { Alert } from "../components/Alert";
import { Button } from "../components/Button";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { Field } from "../components/Field";
import { EmptyState, LoadingState } from "../components/LoadingState";
import { StudentSearchPicker } from "../components/StudentSearchPicker";
import { StatusBadge } from "../components/StatusBadge";
import { useEnrollmentDirectory } from "../hooks/useEnrollmentDirectory";
import { useGrades } from "../hooks/useGrades";
import { usePeriods } from "../hooks/usePeriods";
import { useSubjects } from "../hooks/useSubjects";
import { useUsers } from "../hooks/useUsers";
import { formatGradeValue, validateEmail, validatePassword, validateRequired } from "../services/validation";

type AdminSection = "users" | "subjects" | "periods" | "enrollments" | "grades";
const sectionLabels: Record<AdminSection, string> = {
  users: "Usuarios",
  subjects: "Asignaturas",
  periods: "Periodos",
  enrollments: "Inscripciones",
  grades: "Calificaciones",
};
const sectionSingular: Record<AdminSection, string> = {
  users: "usuario",
  subjects: "asignatura",
  periods: "periodo",
  enrollments: "inscripción",
  grades: "calificación",
};

export function AdminPage() {
  const { users, isLoading: usersLoading, error: usersError, create: createUser, deactivate: deactivateUser } = useUsers();
  const { subjects, isLoading: subjectsLoading, error: subjectsError, create: createSubject, deactivate: deactivateSubject } = useSubjects();
  const { periods, isLoading: periodsLoading, error: periodsError, create: createPeriod, deactivate: deactivatePeriod } = usePeriods();
  const [section, setSection] = useState<AdminSection>("users");
  const [enrollmentSearch, setEnrollmentSearch] = useState("");
  const [enrollmentSubjectFilter, setEnrollmentSubjectFilter] = useState("");
  const [enrollmentPeriodFilter, setEnrollmentPeriodFilter] = useState("");
  const [gradeStudentSearch, setGradeStudentSearch] = useState("");
  const [gradeSubjectId, setGradeSubjectId] = useState("");
  const [gradePeriodId, setGradePeriodId] = useState("");
  const enrollmentDirectory = useEnrollmentDirectory({
    enabled: section === "enrollments",
    search: enrollmentSearch,
    subjectId: enrollmentSubjectFilter || undefined,
    periodId: enrollmentPeriodFilter || undefined,
  });
  const gradeDirectory = useEnrollmentDirectory({
    enabled: section === "grades" && Boolean(gradeSubjectId && gradePeriodId),
    search: gradeStudentSearch,
    subjectId: gradeSubjectId || undefined,
    periodId: gradePeriodId || undefined,
    excludeCancelled: true,
  });
  const [selectedEnrollmentId, setSelectedEnrollmentId] = useState("");
  const { grades, isLoading: gradesLoading, error: gradesError, create: createGrade, update: updateGrade } = useGrades(selectedEnrollmentId);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("student");
  const [code, setCode] = useState("");
  const [subjectName, setSubjectName] = useState("");
  const [credits, setCredits] = useState("4");
  const [teacherIds, setTeacherIds] = useState<string[]>([]);
  const [periodName, setPeriodName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<User | null>(null);
  const [adminSubjectId, setAdminSubjectId] = useState("");
  const [adminPeriodId, setAdminPeriodId] = useState("");
  const [assessmentName, setAssessmentName] = useState("");
  const [gradeValue, setGradeValue] = useState("");
  const [editingGradeId, setEditingGradeId] = useState<string | null>(null);
  const [pendingCancel, setPendingCancel] = useState<Enrollment | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  const activeUsers = users.filter((user) => user.is_active);
  const students = activeUsers.filter((user) => user.role_names.includes("student"));
  const teachers = activeUsers.filter((user) => user.role_names.includes("teacher"));
  const activeSubjects = subjects.filter((subject) => subject.is_active);
  const activePeriods = periods.filter((period) => period.is_active);
  const enrollmentRows = enrollmentDirectory.enrollments;
  const gradeEnrollments = gradeDirectory.enrollments;
  const selectedEnrollment = gradeEnrollments.find((enrollment) => enrollment.id === selectedEnrollmentId);
  const selectedGradeSubject = selectedEnrollment && subjects.find((subject) => subject.id === selectedEnrollment.subject_id);
  const selectedGradePeriod = selectedEnrollment && periods.find((period) => period.id === selectedEnrollment.period_id);
  const apiError = usersError ?? subjectsError ?? periodsError ?? enrollmentDirectory.error ?? gradeDirectory.error ?? gradesError;
  const selectedLoading = section === "users" ? usersLoading : section === "subjects" ? subjectsLoading : section === "periods" ? periodsLoading : section === "enrollments" ? enrollmentDirectory.isLoading : false;
  const selectedCount = section === "users" ? users.length : section === "subjects" ? subjects.length : section === "periods" ? periods.length : section === "enrollments" ? enrollmentRows.length : grades.length;

  const selectSection = (nextSection: AdminSection) => {
    setSection(nextSection);
    setFormError(null);
    setSuccessMessage(null);
  };

  const clearGradeForm = () => {
    setAssessmentName("");
    setGradeValue("");
    setEditingGradeId(null);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    setSuccessMessage(null);
    let validationError: string | undefined;
    if (section === "users") validationError = validateEmail(email) ?? validateRequired(fullName, "El nombre") ?? validatePassword(password);
    if (section === "subjects") validationError = validateRequired(code, "El código") ?? validateRequired(subjectName, "El nombre") ?? (!Number.isInteger(Number(credits)) || Number(credits) < 1 || Number(credits) > 20 ? "Los créditos deben ser un número entero entre 1 y 20." : undefined);
    if (section === "periods") validationError = validateRequired(periodName, "El periodo") ?? (!startDate || !endDate ? "Completa las fechas del periodo." : endDate < startDate ? "La fecha de cierre debe ser posterior a la fecha de inicio." : undefined);
    if (section === "enrollments") validationError = !selectedStudent || !adminSubjectId || !adminPeriodId ? "Busca y selecciona un estudiante, una asignatura y un grupo." : undefined;
    if (section === "grades") {
      const numericValue = Number(gradeValue);
      validationError = !selectedEnrollment || (!editingGradeId && !assessmentName.trim()) || gradeValue.trim() === "" || !Number.isFinite(numericValue) || numericValue < 0 || numericValue > 100
        ? "Selecciona una inscripción y escribe una nota entre 0 y 100."
        : selectedEnrollment.status === "cancelled" ? "No se pueden registrar notas en una inscripción cancelada." : undefined;
    }
    if (validationError) {
      setFormError(validationError);
      return;
    }

    setIsSubmitting(true);
    const wasEditingGrade = Boolean(editingGradeId);
    try {
      if (section === "users") {
        await createUser({ email, full_name: fullName, password, role_names: [role] });
        setEmail(""); setFullName(""); setPassword("");
      } else if (section === "subjects") {
        await createSubject({ code, name: subjectName, credits: Number(credits), teacher_ids: teacherIds });
        setCode(""); setSubjectName(""); setTeacherIds([]);
      } else if (section === "periods") {
        await createPeriod({ name: periodName, start_date: startDate, end_date: endDate });
        setPeriodName(""); setStartDate(""); setEndDate("");
      } else if (section === "enrollments") {
        if (!selectedStudent) return;
        await enrollmentsApi.create({ student_id: selectedStudent.id, subject_id: adminSubjectId, period_id: adminPeriodId });
        enrollmentDirectory.reload();
        setSelectedStudent(null); setAdminSubjectId(""); setAdminPeriodId("");
      } else if (editingGradeId) {
        await updateGrade(editingGradeId, Number(gradeValue));
        clearGradeForm();
      } else if (selectedEnrollment) {
        await createGrade({ enrollment_id: selectedEnrollment.id, assessment_name: assessmentName.trim(), value: Number(gradeValue) });
        clearGradeForm();
      }
      setSuccessMessage(section === "grades"
        ? wasEditingGrade ? "La calificación se actualizó correctamente." : "La calificación se guardó correctamente."
        : `El registro de ${sectionSingular[section]} se creó correctamente.`);
    } catch (requestError) {
      setFormError(getApiErrorMessage(requestError));
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleTeacher = (teacherId: string) => {
    setTeacherIds((current) => current.includes(teacherId) ? current.filter((id) => id !== teacherId) : [...current, teacherId]);
  };

  const requestCancel = async () => {
    if (!pendingCancel) return;
    setIsCancelling(true);
    try {
      await enrollmentsApi.cancel(pendingCancel.id);
      setPendingCancel(null);
      enrollmentDirectory.reload();
      setSuccessMessage("La inscripción se canceló correctamente.");
    } catch (requestError) {
      setFormError(getApiErrorMessage(requestError));
    } finally {
      setIsCancelling(false);
    }
  };

  const deactivateUserSafely = async (id: string) => { try { await deactivateUser(id); } catch { /* Hook exposes the API error. */ } };
  const deactivateSubjectSafely = async (id: string) => { try { await deactivateSubject(id); } catch { /* Hook exposes the API error. */ } };
  const deactivatePeriodSafely = async (id: string) => { try { await deactivatePeriod(id); } catch { /* Hook exposes the API error. */ } };

  const beginGradeEdit = (grade: Grade) => {
    setEditingGradeId(grade.id);
    setAssessmentName(grade.assessment_name);
    setGradeValue(String(grade.value));
    setFormError(null);
    setSuccessMessage(null);
  };

  const sectionDescription: Record<AdminSection, string> = {
    users: "Crea estudiantes, docentes y administradores; revisa sus roles y acceso.",
    subjects: "Organiza asignaturas y asigna los docentes responsables.",
    periods: "Define los grupos académicos por periodo.",
    enrollments: "Relaciona a cada estudiante con una asignatura y su grupo.",
    grades: "Selecciona asignatura, grupo e inscripción antes de guardar una nota.",
  };

  return (
    <div className="content-page">
      <div className="page-intro"><div><span className="eyebrow">Control del campus</span><h2>Administración</h2><p>Gestiona personas y relaciones académicas desde espacios de trabajo separados.</p></div><span className="admin-badge"><Shield size={15} />Acceso total</span></div>
      {apiError ? <Alert message={apiError} /> : null}
      {formError ? <Alert message={formError} /> : null}
      {successMessage ? <Alert message={successMessage} tone="success" /> : null}

      <section className="admin-summary" aria-label="Resumen de registros">
        <div><span>Estudiantes activos</span><strong>{students.length}</strong></div><div><span>Docentes activos</span><strong>{teachers.length}</strong></div><div><span>Asignaturas activas</span><strong>{activeSubjects.length}</strong></div><div><span>Grupos activos</span><strong>{activePeriods.length}</strong></div>
      </section>

      <nav aria-label="Áreas de administración" className="admin-section-nav">
        {(Object.keys(sectionLabels) as AdminSection[]).map((item) => <button aria-current={section === item ? "page" : undefined} className={section === item ? "admin-section-active" : ""} key={item} onClick={() => selectSection(item)} type="button">
          {item === "users" ? <Users size={17} /> : item === "subjects" ? <BookOpen size={17} /> : item === "periods" ? <CalendarDays size={17} /> : item === "enrollments" ? <ClipboardList size={17} /> : <GraduationCap size={17} />}
          <span>{sectionLabels[item]}</span>
          <small>{item === "users" ? users.length : item === "subjects" ? subjects.length : item === "periods" ? periods.length : ""}</small>
        </button>)}
      </nav>

      <div className="admin-workspace-heading"><div><span className="eyebrow">Espacio de trabajo</span><h3>{sectionLabels[section]}</h3><p>{sectionDescription[section]}</p></div><span className="admin-workspace-count">{section === "grades" ? selectedCount : section === "enrollments" ? `Mostrando ${selectedCount}` : `${selectedCount} registros`}</span></div>

      <div className="admin-workspace">
        <section className="panel admin-editor-panel">
          <div className="panel-heading"><div><span className="eyebrow">{section === "grades" ? "Contexto antes de calificar" : "Gestión"}</span><h3>{section === "grades" ? (editingGradeId ? "Editar calificación" : "Nueva calificación") : `Crear ${section === "subjects" ? "asignatura" : section === "periods" ? "periodo" : section === "enrollments" ? "inscripción" : "usuario"}`}</h3></div><div className="panel-heading-icon">{section === "users" ? <UserPlus size={20} /> : section === "subjects" ? <BookOpen size={20} /> : section === "periods" ? <CalendarDays size={20} /> : section === "enrollments" ? <ClipboardList size={20} /> : <GraduationCap size={20} />}</div></div>
          <form className="admin-editor-form" onSubmit={submit}>
            {section === "users" ? <>
              <Field id="admin-name" label="Nombre completo" placeholder="Nombre del usuario" value={fullName} onChange={(event) => setFullName(event.target.value)} />
              <Field id="admin-email" label="Correo electrónico" placeholder="persona@universidad.edu" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
              <Field id="admin-password" label="Contraseña inicial" placeholder="12+ caracteres" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
              <Field as="select" id="admin-role" label="Rol" value={role} onChange={(event) => setRole(event.target.value as Role)}><option value="student">Estudiante</option><option value="teacher">Docente</option><option value="admin">Administrador</option></Field>
            </> : null}
            {section === "subjects" ? <>
              <Field id="admin-code" label="Código de asignatura" placeholder="MAT101" value={code} onChange={(event) => setCode(event.target.value)} />
              <Field id="admin-subject-name" label="Nombre" placeholder="Matemáticas I" value={subjectName} onChange={(event) => setSubjectName(event.target.value)} />
              <Field id="admin-credits" label="Créditos" max="20" min="1" type="number" value={credits} onChange={(event) => setCredits(event.target.value)} />
              <fieldset className="teacher-assignment-list"><legend>Docentes responsables</legend>{teachers.length ? teachers.map((teacher) => <label className="checkbox-option" key={teacher.id}><input checked={teacherIds.includes(teacher.id)} onChange={() => toggleTeacher(teacher.id)} type="checkbox" /><span><strong>{teacher.full_name}</strong><small>{teacher.email}</small></span></label>) : <p className="muted-copy">Crea primero un usuario con rol docente.</p>}</fieldset>
            </> : null}
            {section === "periods" ? <>
              <Field id="admin-period-name" label="Nombre del grupo / periodo" placeholder="2026-A · Grupo 01" value={periodName} onChange={(event) => setPeriodName(event.target.value)} />
              <Field id="admin-start-date" label="Fecha de inicio" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
              <Field id="admin-end-date" label="Fecha de cierre" type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
            </> : null}
            {section === "enrollments" ? <>
              <div className="form-step-label"><span>1</span><strong>Estudiante</strong></div>
              <StudentSearchPicker onSelect={setSelectedStudent} selectedStudent={selectedStudent} />
              <div className="form-step-label"><span>2</span><strong>Asignatura y grupo</strong></div>
              <Field as="select" id="admin-subject" label="Asignatura" value={adminSubjectId} onChange={(event) => setAdminSubjectId(event.target.value)}><option value="">Selecciona una asignatura</option>{activeSubjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.code} · {subject.name}</option>)}</Field>
              <Field as="select" id="admin-period" label="Grupo / periodo" value={adminPeriodId} onChange={(event) => setAdminPeriodId(event.target.value)}><option value="">Selecciona un grupo</option>{activePeriods.map((period) => <option key={period.id} value={period.id}>{period.name}</option>)}</Field>
            </> : null}
            {section === "grades" ? <>
              <Field as="select" id="grade-subject" label="1 · Asignatura" value={gradeSubjectId} onChange={(event) => { setGradeSubjectId(event.target.value); setGradePeriodId(""); setSelectedEnrollmentId(""); clearGradeForm(); }}><option value="">Selecciona una asignatura</option>{activeSubjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.code} · {subject.name}</option>)}</Field>
              <Field as="select" id="grade-period" label="2 · Grupo / periodo" value={gradePeriodId} onChange={(event) => { setGradePeriodId(event.target.value); setSelectedEnrollmentId(""); setGradeStudentSearch(""); clearGradeForm(); }}><option value="">Selecciona un grupo</option>{activePeriods.map((period) => <option key={period.id} value={period.id}>{period.name}</option>)}</Field>
              {gradeSubjectId && gradePeriodId ? <div className="grade-student-lookup">
                <Field id="grade-student-search" label="3 · Filtrar por nombre o correo" placeholder="Escribe al menos 2 caracteres" type="search" value={gradeStudentSearch} onChange={(event) => { setGradeStudentSearch(event.target.value); setSelectedEnrollmentId(""); clearGradeForm(); }} />
                {gradeStudentSearch.trim().length === 1 ? <small className="picker-hint">Escribe al menos 2 caracteres para filtrar.</small> : null}
                {gradeDirectory.isLoading ? <LoadingState label="Buscando inscripciones" /> : null}
                {!gradeDirectory.isLoading && gradeDirectory.isSearchReady && !selectedEnrollmentId && gradeEnrollments.length === 0 ? <div className="picker-status">No hay inscripciones para esta asignatura y grupo con ese filtro.</div> : null}
                {gradeEnrollments.length > 0 && !gradeDirectory.isLoading ? <div aria-label="Inscripciones encontradas" className="enrollment-search-results">{gradeEnrollments.map((enrollment) => {
                  const enrollmentSubject = subjects.find((subject) => subject.id === enrollment.subject_id);
                  const enrollmentPeriod = periods.find((period) => period.id === enrollment.period_id);
                  return <button aria-pressed={selectedEnrollmentId === enrollment.id} className={`enrollment-search-result ${selectedEnrollmentId === enrollment.id ? "enrollment-search-result-selected" : ""}`} key={enrollment.id} onClick={() => { setSelectedEnrollmentId(enrollment.id); clearGradeForm(); }} type="button">
                    <span><strong>{enrollment.student_name}</strong><small>{enrollmentSubject?.code ?? "Asignatura"} · {enrollmentPeriod?.name ?? "Grupo"}</small><small>Inscripción {enrollment.id.slice(0, 8)}…</small></span><StatusBadge status={enrollment.status} />
                  </button>;
                })}</div> : null}
                {gradeDirectory.hasMore ? <Button disabled={gradeDirectory.isLoadingMore} isLoading={gradeDirectory.isLoadingMore} onClick={() => void gradeDirectory.loadMore()} type="button" variant="ghost">Cargar más estudiantes</Button> : null}
              </div> : <p className="picker-hint">Selecciona primero la asignatura y el grupo.</p>}
              {selectedEnrollment ? <div className="grade-context admin-grade-context"><strong>{selectedEnrollment.student_name}</strong><span>{selectedGradeSubject?.code ?? "Asignatura"} · {selectedGradeSubject?.name ?? "No disponible"}</span><span>Grupo / periodo: {selectedGradePeriod?.name ?? "No disponible"}</span><span>Inscripción {selectedEnrollment.id.slice(0, 8)}…</span><StatusBadge status={selectedEnrollment.status} /></div> : null}
              {editingGradeId ? <div className="field"><span className="field-label">Evaluación seleccionada</span><strong>{assessmentName}</strong><Button onClick={clearGradeForm} type="button" variant="ghost">Cancelar edición</Button></div> : <Field id="admin-assessment" label="4 · Nombre de evaluación" placeholder="Parcial 1" value={assessmentName} onChange={(event) => setAssessmentName(event.target.value)} />}
              <Field id="admin-grade-value" label="5 · Nota (0 a 100)" max="100" min="0" placeholder="0.00" step="0.01" type="number" value={gradeValue} onChange={(event) => setGradeValue(event.target.value)} />
            </> : null}
            <Button isLoading={isSubmitting} type="submit"><Plus size={17} />{section === "grades" ? (editingGradeId ? "Guardar cambio" : "Registrar nota") : `Crear ${section === "subjects" ? "asignatura" : section === "periods" ? "periodo" : section === "enrollments" ? "inscripción" : "usuario"}`}</Button>
          </form>
        </section>

        <section className="panel admin-directory-panel">
          <div className="panel-heading"><div><span className="eyebrow">Directorio</span><h3>{sectionLabels[section]}</h3></div><span className="directory-count">{selectedCount}</span></div>
          {selectedLoading ? <LoadingState label={`Cargando ${sectionLabels[section].toLowerCase()}`} /> : null}
          {!selectedLoading && section === "users" ? users.length ? <div className="admin-table-wrap"><table><caption className="sr-only">Usuarios del campus</caption><thead><tr><th>Persona</th><th>Rol</th><th>Estado</th><th>Acción</th></tr></thead><tbody>{users.map((user) => <tr key={user.id}><td><strong>{user.full_name}</strong><small className="table-secondary">{user.email}</small></td><td>{user.role_names.map(roleName).join(", ")}</td><td><StatusBadge status={user.is_active ? "active" : "cancelled"} /></td><td>{user.is_active ? <Button onClick={() => void deactivateUserSafely(user.id)} variant="ghost">Desactivar</Button> : <span className="muted-copy">Inactivo</span>}</td></tr>)}</tbody></table></div> : <EmptyState description="Los perfiles que registres aparecerán aquí." title="Aún no hay usuarios" /> : null}
          {!selectedLoading && section === "subjects" ? subjects.length ? <div className="admin-table-wrap"><table><caption className="sr-only">Asignaturas del campus</caption><thead><tr><th>Asignatura</th><th>Créditos</th><th>Docentes responsables</th><th>Estado</th><th>Acción</th></tr></thead><tbody>{subjects.map((subject) => <tr key={subject.id}><td><strong>{subject.code}</strong><small className="table-secondary">{subject.name}</small></td><td>{subject.credits}</td><td>{subject.teacher_ids.map((id) => users.find((user) => user.id === id)?.full_name).filter(Boolean).join(", ") || "Sin asignar"}</td><td><StatusBadge status={subject.is_active ? "active" : "cancelled"} /></td><td>{subject.is_active ? <Button onClick={() => void deactivateSubjectSafely(subject.id)} variant="ghost">Desactivar</Button> : <span className="muted-copy">Inactiva</span>}</td></tr>)}</tbody></table></div> : <EmptyState description="Crea una asignatura y asigna a los docentes responsables." title="Aún no hay asignaturas" /> : null}
          {!selectedLoading && section === "periods" ? periods.length ? <div className="admin-table-wrap"><table><caption className="sr-only">Grupos y periodos académicos</caption><thead><tr><th>Grupo / periodo</th><th>Fechas</th><th>Estado</th><th>Acción</th></tr></thead><tbody>{periods.map((period) => <tr key={period.id}><td><strong>{period.name}</strong></td><td>{new Date(`${period.start_date}T00:00:00`).toLocaleDateString("es-CO")} – {new Date(`${period.end_date}T00:00:00`).toLocaleDateString("es-CO")}</td><td><StatusBadge status={period.is_active ? "active" : "cancelled"} /></td><td>{period.is_active ? <Button onClick={() => void deactivatePeriodSafely(period.id)} variant="ghost">Desactivar</Button> : <span className="muted-copy">Inactivo</span>}</td></tr>)}</tbody></table></div> : <EmptyState description="Crea un grupo o periodo para organizar las inscripciones." title="Aún no hay periodos" /> : null}
          {!selectedLoading && section === "enrollments" ? <>
            <div className="enrollment-directory-filters">
              <Field id="enrollment-directory-search" label="Buscar estudiante" placeholder="Nombre o correo (mínimo 2 caracteres)" type="search" value={enrollmentSearch} onChange={(event) => setEnrollmentSearch(event.target.value)} />
              <Field as="select" id="enrollment-directory-subject" label="Asignatura" value={enrollmentSubjectFilter} onChange={(event) => setEnrollmentSubjectFilter(event.target.value)}><option value="">Todas</option>{subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.code} · {subject.name}</option>)}</Field>
              <Field as="select" id="enrollment-directory-period" label="Grupo / periodo" value={enrollmentPeriodFilter} onChange={(event) => setEnrollmentPeriodFilter(event.target.value)}><option value="">Todos</option>{periods.map((period) => <option key={period.id} value={period.id}>{period.name}</option>)}</Field>
            </div>
            {enrollmentSearch.trim().length === 1 ? <p className="picker-hint">Escribe al menos 2 caracteres para filtrar por estudiante.</p> : null}
            {enrollmentDirectory.isLoading ? <LoadingState label="Cargando resultados de inscripciones" /> : enrollmentRows.length ? <div className="admin-table-wrap"><table><caption className="sr-only">Resultados de inscripciones académicas</caption><thead><tr><th>Estudiante</th><th>Asignatura</th><th>Grupo</th><th>Estado</th><th>Acción</th></tr></thead><tbody>{enrollmentRows.map((enrollment) => <EnrollmentRow enrollment={enrollment} key={enrollment.id} onCancel={() => setPendingCancel(enrollment)} periods={periods} subjects={subjects} />)}</tbody></table></div> : enrollmentDirectory.isSearchReady ? <EmptyState description="Cambia los filtros o registra una inscripción nueva." title="No se encontraron inscripciones" /> : null}
            <div className="directory-pagination"><span>Mostrando {enrollmentRows.length} resultados</span>{enrollmentDirectory.hasMore ? <Button disabled={enrollmentDirectory.isLoadingMore} isLoading={enrollmentDirectory.isLoadingMore} onClick={() => void enrollmentDirectory.loadMore()} variant="secondary">Cargar más</Button> : null}</div>
          </> : null}
          {!selectedLoading && section === "grades" ? !selectedEnrollmentId ? <EmptyState description="Completa los tres primeros pasos del formulario para ver las calificaciones." title="Selecciona una inscripción" /> : gradesLoading ? <LoadingState label="Cargando notas de esta inscripción" /> : grades.length ? <div className="admin-grade-list">{grades.map((grade) => <div className="admin-grade-row" key={grade.id}><div><strong>{grade.assessment_name}</strong><small>Inscripción de {selectedEnrollment?.student_name ?? "estudiante"} · {new Date(grade.graded_at).toLocaleDateString("es-CO")}</small></div><strong className="grade-value">{formatGradeValue(grade.value)}</strong><Button disabled={selectedEnrollment?.status === "cancelled"} onClick={() => beginGradeEdit(grade)} variant="secondary">Editar</Button></div>)}</div> : <EmptyState description="Registra una evaluación para esta persona; las notas se mostrarán aquí." title="Sin calificaciones todavía" /> : null}
        </section>
      </div>

      {pendingCancel ? <ConfirmDialog confirmLabel="Sí, cancelar inscripción" description={`Se cancelará la inscripción de ${pendingCancel.student_name} en ${subjects.find((subject) => subject.id === pendingCancel.subject_id)?.name ?? "esta asignatura"}, grupo ${periods.find((period) => period.id === pendingCancel.period_id)?.name ?? "no disponible"}. El historial se conservará y las notas asociadas dejarán de contar en el promedio.`} isConfirming={isCancelling} onCancel={() => setPendingCancel(null)} onConfirm={() => void requestCancel()} title="¿Cancelar esta inscripción?" /> : null}
    </div>
  );

  function roleName(roleValue: Role) {
    return roleValue === "student" ? "Estudiante" : roleValue === "teacher" ? "Docente" : "Administrador";
  }
}

function EnrollmentRow({ enrollment, periods, subjects, onCancel }: { enrollment: Enrollment; periods: ReturnType<typeof usePeriods>["periods"]; subjects: ReturnType<typeof useSubjects>["subjects"]; onCancel: () => void }) {
  const subject = subjects.find((item) => item.id === enrollment.subject_id);
  const period = periods.find((item) => item.id === enrollment.period_id);
  return <tr><td><strong>{enrollment.student_name}</strong><small className="table-secondary">Inscripción {enrollment.id.slice(0, 8)}…</small></td><td>{subject ? `${subject.code} · ${subject.name}` : "Asignatura no disponible"}</td><td>{period?.name ?? "Grupo no disponible"}</td><td><StatusBadge status={enrollment.status} /></td><td>{enrollment.status === "active" ? <Button onClick={onCancel} variant="danger">Cancelar</Button> : <span className="muted-copy">Sin acción</span>}</td></tr>;
}
