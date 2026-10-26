"""Business operations for student enrollments."""

from uuid import UUID

from sqlalchemy import or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.exceptions import AuthorizationError, ConflictError, NotFoundError
from app.enrollments.models import Enrollment, EnrollmentStatus
from app.enrollments.schemas import EnrollmentCreate, EnrollmentUpdate
from app.periods.models import AcademicPeriod
from app.subjects.models import Subject, SubjectTeacher
from app.users.models import Role, User, UserRole


def _role_names(user: User) -> set[str]:
    """Return normalized role names already loaded for a user."""

    return {role.name for role in user.roles}


def _ensure_teacher_subject(database: Session, actor: User, subject_id: UUID) -> None:
    """Require a teacher to own the subject being managed."""

    roles = _role_names(actor)
    if "teacher" in roles and "admin" not in roles:
        assigned = database.scalar(
            select(SubjectTeacher.subject_id).where(
                SubjectTeacher.subject_id == subject_id, SubjectTeacher.teacher_id == actor.id
            )
        )
        if assigned is None:
            raise AuthorizationError("El docente no está asignado a esta materia")


def create_enrollment(database: Session, payload: EnrollmentCreate, actor: User) -> Enrollment:
    """Enroll a student after checking ownership, resources and active states."""

    actor_roles = _role_names(actor)
    if "student" in actor_roles and payload.student_id != actor.id:
        raise AuthorizationError("Un estudiante solo puede gestionar su propia inscripción")
    student = database.get(User, payload.student_id)
    subject = database.get(Subject, payload.subject_id)
    period = database.get(AcademicPeriod, payload.period_id)
    if student is None or not student.is_active:
        raise NotFoundError("Estudiante no encontrado o inactivo")
    if database.scalar(
        select(Role.id)
        .join(UserRole, UserRole.role_id == Role.id)
        .where(UserRole.user_id == student.id, Role.name == "student")
    ) is None:
        raise ConflictError("El usuario indicado no tiene rol de estudiante")
    if subject is None or not subject.is_active:
        raise ConflictError("La materia no existe o está inactiva")
    if period is None or not period.is_active:
        raise ConflictError("El periodo no existe o está inactivo")
    _ensure_teacher_subject(database, actor, payload.subject_id)
    enrollment = Enrollment(**payload.model_dump())
    database.add(enrollment)
    try:
        database.commit()
    except IntegrityError as error:
        database.rollback()
        raise ConflictError("El estudiante ya está inscrito en esa materia y periodo") from error
    database.refresh(enrollment)
    return enrollment


def list_enrollments(
    database: Session,
    actor: User,
    offset: int,
    limit: int,
    *,
    student_search: str | None = None,
    subject_id: UUID | None = None,
    period_id: UUID | None = None,
    exclude_cancelled: bool = False,
) -> list[Enrollment]:
    """Return enrollments visible to the authenticated actor."""

    query = select(Enrollment).order_by(Enrollment.enrolled_at.desc()).offset(offset).limit(limit)
    roles = _role_names(actor)
    if "student" in roles and "admin" not in roles and "teacher" not in roles:
        query = query.where(Enrollment.student_id == actor.id)
    if "teacher" in roles and "admin" not in roles:
        query = query.join(SubjectTeacher, SubjectTeacher.subject_id == Enrollment.subject_id).where(
            SubjectTeacher.teacher_id == actor.id
        )
    if student_search:
        pattern = f"%{student_search.strip()}%"
        query = query.join(User, User.id == Enrollment.student_id).where(
            or_(User.full_name.ilike(pattern), User.email.ilike(pattern))
        )
    if subject_id is not None:
        query = query.where(Enrollment.subject_id == subject_id)
    if period_id is not None:
        query = query.where(Enrollment.period_id == period_id)
    if exclude_cancelled:
        query = query.where(Enrollment.status != EnrollmentStatus.CANCELLED)
    return list(database.scalars(query).all())


def get_enrollment(database: Session, enrollment_id: UUID, actor: User) -> Enrollment:
    """Return an enrollment if the actor is allowed to see it."""

    enrollment = database.get(Enrollment, enrollment_id)
    if enrollment is None:
        raise NotFoundError("Inscripción no encontrada")
    actor_roles = _role_names(actor)
    if "student" in actor_roles and not actor_roles.intersection({"admin", "teacher"}) and enrollment.student_id != actor.id:
        raise AuthorizationError("No tiene acceso a esta inscripción")
    if "teacher" in actor_roles and "admin" not in actor_roles:
        _ensure_teacher_subject(database, actor, enrollment.subject_id)
    return enrollment


def update_enrollment(database: Session, enrollment_id: UUID, payload: EnrollmentUpdate, actor: User) -> Enrollment:
    """Update enrollment lifecycle state for privileged users."""

    if not _role_names(actor).intersection({"admin", "teacher"}):
        raise AuthorizationError("Solo docentes o administradores pueden actualizar inscripciones")
    enrollment = get_enrollment(database, enrollment_id, actor)
    if enrollment.status == EnrollmentStatus.CANCELLED and payload.status.value != EnrollmentStatus.ACTIVE.value:
        raise ConflictError("Una inscripción cancelada no puede cambiar a ese estado")
    enrollment.status = EnrollmentStatus(payload.status.value)
    database.commit()
    database.refresh(enrollment)
    return enrollment


def cancel_enrollment(database: Session, enrollment_id: UUID, actor: User) -> Enrollment:
    """Cancel an enrollment while preserving its history."""

    enrollment = get_enrollment(database, enrollment_id, actor)
    if enrollment.status == EnrollmentStatus.CANCELLED:
        raise ConflictError("La inscripción ya está cancelada")
    if "student" not in _role_names(actor) and not _role_names(actor).intersection({"admin", "teacher"}):
        raise AuthorizationError("No tiene permisos para cancelar inscripciones")
    enrollment.status = EnrollmentStatus.CANCELLED
    database.commit()
    database.refresh(enrollment)
    return enrollment
