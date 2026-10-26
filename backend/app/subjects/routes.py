"""Subject endpoints."""

from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, require_csrf, require_roles
from app.database.session import get_db
from app.subjects.models import Subject
from app.subjects.schemas import SubjectCreate, SubjectResponse, SubjectUpdate
from app.subjects.services import (
    create_subject,
    deactivate_subject,
    get_subject_for_actor,
    list_subjects,
    subject_response_data,
    update_subject_for_actor,
)
from app.users.models import User

router = APIRouter(prefix="/subjects", tags=["subjects"], dependencies=[Depends(require_csrf)])


@router.post("/", response_model=SubjectResponse, status_code=status.HTTP_201_CREATED)
def create(
    payload: SubjectCreate,
    database: Session = Depends(get_db),
    _: User = Depends(require_roles("admin")),
) -> SubjectResponse:
    """Create a subject."""

    return SubjectResponse.model_validate(subject_response_data(create_subject(database, payload)))


@router.get("/", response_model=list[SubjectResponse])
def list_all(
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=100),
    database: Session = Depends(get_db),
    actor: User = Depends(get_current_user),
) -> list[SubjectResponse]:
    """List subjects for authenticated users."""

    teacher_id = actor.id if "teacher" in {role.name for role in actor.roles} else None
    return [SubjectResponse.model_validate(subject_response_data(subject)) for subject in list_subjects(database, offset, limit, teacher_id)]


@router.get("/{subject_id}", response_model=SubjectResponse)
def get_one(subject_id: UUID, database: Session = Depends(get_db), actor: User = Depends(get_current_user)) -> SubjectResponse:
    """Get one subject."""

    return SubjectResponse.model_validate(subject_response_data(get_subject_for_actor(database, subject_id, actor)))


@router.put("/{subject_id}", response_model=SubjectResponse)
def update(
    subject_id: UUID,
    payload: SubjectUpdate,
    database: Session = Depends(get_db),
    actor: User = Depends(require_roles("admin", "teacher")),
) -> SubjectResponse:
    """Update a subject."""

    return SubjectResponse.model_validate(subject_response_data(update_subject_for_actor(database, subject_id, payload, actor)))


@router.delete("/{subject_id}", response_model=SubjectResponse)
def deactivate(subject_id: UUID, database: Session = Depends(get_db), _: User = Depends(require_roles("admin"))) -> SubjectResponse:
    """Deactivate a subject while retaining its history."""

    return SubjectResponse.model_validate(subject_response_data(deactivate_subject(database, subject_id)))