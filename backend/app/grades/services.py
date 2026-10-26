"""Business operations for grades."""

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.exceptions import AuthorizationError, ConflictError, NotFoundError
from app.enrollments.models import Enrollment
from app.grades.models import Grade
from app.grades.schemas import GradeCreate, GradeUpdate
from app.subjects.models import SubjectTeacher
from app.users.models import User


def _is_privileged(actor: User) -> bool:
    """Return whether a user may write grades."""

    return bool({role.name for role in actor.roles}.intersection({"admin", "teacher"}))


def _ensure_teacher_owns_enrollment(database: Session, actor: User, enrollment: Enrollment) -> None:
    """Limit teacher access to grades in assigned subjects."""

    roles = {role.name for role in actor.roles}
    if "teacher" in roles and "admin" not in roles:
        assigned = database.scalar(
            select(SubjectTeacher.subject_id).where(
                SubjectTeacher.subject_id == enrollment.subject_id, SubjectTeacher.teacher_id == actor.id
            )
        )
        if assigned is None:
            raise AuthorizationError("El docente no está asignado a esta materia")


def create_grade(database: Session, payload: GradeCreate, actor: User) -> Grade:
    """Register a grade for an existing enrollment."""

    if not _is_privileged(actor):
        raise AuthorizationError("Solo docentes o administradores pueden registrar calificaciones")
    enrollment = database.get(Enrollment, payload.enrollment_id)
    if enrollment is None:
        raise NotFoundError("Inscripción no encontrada")
    _ensure_teacher_owns_enrollment(database, actor, enrollment)
    grade = Grade(**payload.model_dump())
    database.add(grade)
    try:
        database.commit()
    except IntegrityError as error:
        database.rollback()
        raise ConflictError("Ya existe una calificación para esa evaluación") from error
    database.refresh(grade)
    return grade


def list_grades(database: Session, enrollment_id: UUID, actor: User) -> list[Grade]:
    """List grades, restricting students to their own enrollment."""

    enrollment = database.get(Enrollment, enrollment_id)
    if enrollment is None:
        raise NotFoundError("Inscripción no encontrada")
    _ensure_teacher_owns_enrollment(database, actor, enrollment)
    if not _is_privileged(actor) and enrollment.student_id != actor.id:
        raise AuthorizationError("No tiene acceso a estas calificaciones")
    return list(
        database.scalars(
            select(Grade)
            .where(Grade.enrollment_id == enrollment_id, Grade.is_active.is_(True))
            .order_by(Grade.assessment_name)
        ).all()
    )


def get_grade(database: Session, grade_id: UUID, actor: User) -> Grade:
    """Return one grade after applying enrollment visibility rules."""

    grade = database.get(Grade, grade_id)
    if grade is None:
        raise NotFoundError("Calificación no encontrada")
    if not grade.is_active:
        raise NotFoundError("Calificación no encontrada")
    enrollment = database.get(Enrollment, grade.enrollment_id)
    if enrollment is None:
        raise NotFoundError("Inscripción no encontrada")
    _ensure_teacher_owns_enrollment(database, actor, enrollment)
    if not _is_privileged(actor) and enrollment.student_id != actor.id:
        raise AuthorizationError("No tiene acceso a esta calificación")
    return grade


def update_grade(database: Session, grade_id: UUID, payload: GradeUpdate, actor: User) -> Grade:
    """Update a grade value for privileged users."""

    if not _is_privileged(actor):
        raise AuthorizationError("Solo docentes o administradores pueden actualizar calificaciones")
    grade = get_grade(database, grade_id, actor)
    grade.value = payload.value
    database.commit()
    database.refresh(grade)
    return grade


def deactivate_grade(database: Session, grade_id: UUID, actor: User) -> Grade:
    """Deactivate a grade instead of deleting academic history."""

    if not _is_privileged(actor):
        raise AuthorizationError("Solo docentes o administradores pueden eliminar calificaciones")
    grade = get_grade(database, grade_id, actor)
    grade.is_active = False
    database.commit()
    database.refresh(grade)
    return grade