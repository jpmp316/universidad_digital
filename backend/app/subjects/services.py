"""Business operations for subjects."""

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.exceptions import AuthorizationError, ConflictError, NotFoundError
from app.subjects.models import Subject, SubjectTeacher
from app.subjects.schemas import SubjectCreate, SubjectUpdate
from app.users.models import Role, User


def _get_teachers(database: Session, teacher_ids: list[UUID]) -> list[User]:
    """Resolve only active users with the teacher role."""

    if not teacher_ids:
        return []
    teachers = list(
        database.scalars(
            select(User)
            .join(User.roles)
            .where(User.id.in_(teacher_ids), User.is_active.is_(True), Role.name == "teacher")
        ).all()
    )
    if len({teacher.id for teacher in teachers}) != len(set(teacher_ids)):
        raise ConflictError("Uno o más docentes no son válidos")
    return teachers


def subject_response_data(subject: Subject) -> dict[str, object]:
    """Build the public subject representation."""

    return {
        "id": subject.id,
        "code": subject.code,
        "name": subject.name,
        "description": subject.description,
        "credits": subject.credits,
        "is_active": subject.is_active,
        "teacher_ids": [teacher.id for teacher in subject.teachers],
    }


def is_teacher_assigned(database: Session, teacher_id: UUID, subject_id: UUID) -> bool:
    """Check whether a teacher owns the subject resource."""

    return database.scalar(
        select(SubjectTeacher.subject_id).where(
            SubjectTeacher.subject_id == subject_id, SubjectTeacher.teacher_id == teacher_id
        )
    ) is not None


def create_subject(database: Session, payload: SubjectCreate) -> Subject:
    """Create an academic subject."""

    values = payload.model_dump(exclude={"teacher_ids"})
    values["code"] = payload.code.strip().upper()
    values["name"] = payload.name.strip()
    subject = Subject(**values)
    subject.teachers = _get_teachers(database, payload.teacher_ids)
    database.add(subject)
    try:
        database.commit()
    except IntegrityError as error:
        database.rollback()
        raise ConflictError("El código de materia ya existe") from error
    database.refresh(subject)
    return subject


def list_subjects(database: Session, offset: int, limit: int, teacher_id: UUID | None = None) -> list[Subject]:
    """Return a bounded subject page."""

    query = select(Subject).order_by(Subject.code).offset(offset).limit(limit)
    if teacher_id is not None:
        query = query.join(SubjectTeacher).where(SubjectTeacher.teacher_id == teacher_id)
    return list(database.scalars(query).unique().all())


def get_subject(database: Session, subject_id: UUID) -> Subject:
    """Return one subject or raise not found."""

    subject = database.get(Subject, subject_id)
    if subject is None:
        raise NotFoundError("Materia no encontrada")
    return subject


def update_subject(database: Session, subject_id: UUID, payload: SubjectUpdate) -> Subject:
    """Update subject metadata and availability."""

    subject = get_subject(database, subject_id)
    values = payload.model_dump(exclude_unset=True)
    teacher_ids = values.pop("teacher_ids", None)
    for field, value in values.items():
        setattr(subject, field, value.strip() if field == "name" and isinstance(value, str) else value)
    if teacher_ids is not None:
        subject.teachers = _get_teachers(database, teacher_ids)
    try:
        database.commit()
    except IntegrityError as error:
        database.rollback()
        raise ConflictError("No se pudo actualizar la materia") from error
    database.refresh(subject)
    return subject


def deactivate_subject(database: Session, subject_id: UUID) -> Subject:
    """Deactivate a subject without removing historical enrollments."""

    subject = get_subject(database, subject_id)
    subject.is_active = False
    database.commit()
    database.refresh(subject)
    return subject


def get_subject_for_actor(database: Session, subject_id: UUID, actor: User) -> Subject:
    """Return a subject only when the actor owns or may access it."""

    subject = get_subject(database, subject_id)
    roles = {role.name for role in actor.roles}
    if "teacher" in roles and not roles.intersection({"admin"}) and not is_teacher_assigned(database, actor.id, subject_id):
        raise AuthorizationError("No tiene acceso a esta materia")
    return subject


def update_subject_for_actor(database: Session, subject_id: UUID, payload: SubjectUpdate, actor: User) -> Subject:
    """Allow a teacher to update metadata only for an assigned subject."""

    subject = get_subject_for_actor(database, subject_id, actor)
    roles = {role.name for role in actor.roles}
    values = payload.model_dump(exclude_unset=True)
    teacher_ids = values.pop("teacher_ids", None)
    if "teacher" in roles and "admin" not in roles and teacher_ids is not None:
        raise AuthorizationError("Solo un administrador puede modificar asignaciones docentes")
    for field, value in values.items():
        setattr(subject, field, value.strip() if field == "name" and isinstance(value, str) else value)
    if teacher_ids is not None:
        subject.teachers = _get_teachers(database, teacher_ids)
    try:
        database.commit()
    except IntegrityError as error:
        database.rollback()
        raise ConflictError("No se pudo actualizar la materia") from error
    database.refresh(subject)
    return subject