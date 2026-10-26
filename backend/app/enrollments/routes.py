"""Enrollment endpoints."""

from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.dependencies import require_csrf, require_roles
from app.database.session import get_db
from app.enrollments.models import Enrollment
from app.enrollments.schemas import EnrollmentCreate, EnrollmentResponse, EnrollmentUpdate
from app.enrollments.services import cancel_enrollment, create_enrollment, get_enrollment, list_enrollments, update_enrollment
from app.users.models import User

router = APIRouter(prefix="/enrollments", tags=["enrollments"], dependencies=[Depends(require_csrf)])


@router.post("/", response_model=EnrollmentResponse, status_code=status.HTTP_201_CREATED)
def create(
    payload: EnrollmentCreate,
    database: Session = Depends(get_db),
    actor: User = Depends(require_roles("student", "teacher", "admin")),
) -> Enrollment:
    """Create an enrollment after service-level authorization."""

    return create_enrollment(database, payload, actor)


@router.get("/", response_model=list[EnrollmentResponse])
def list_all(
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=100),
    student_search: str | None = Query(default=None, min_length=2, max_length=120),
    subject_id: UUID | None = None,
    period_id: UUID | None = None,
    exclude_cancelled: bool = False,
    database: Session = Depends(get_db),
    actor: User = Depends(require_roles("student", "teacher", "admin")),
) -> list[Enrollment]:
    """List enrollments visible to the authenticated actor."""

    return list_enrollments(
        database,
        actor,
        offset,
        limit,
        student_search=student_search,
        subject_id=subject_id,
        period_id=period_id,
        exclude_cancelled=exclude_cancelled,
    )


@router.get("/{enrollment_id}", response_model=EnrollmentResponse)
def get_one(
    enrollment_id: UUID,
    database: Session = Depends(get_db),
    actor: User = Depends(require_roles("student", "teacher", "admin")),
) -> Enrollment:
    """Get one visible enrollment."""

    return get_enrollment(database, enrollment_id, actor)


@router.put("/{enrollment_id}", response_model=EnrollmentResponse)
def update(
    enrollment_id: UUID,
    payload: EnrollmentUpdate,
    database: Session = Depends(get_db),
    actor: User = Depends(require_roles("teacher", "admin")),
) -> Enrollment:
    """Update an enrollment status."""

    return update_enrollment(database, enrollment_id, payload, actor)


@router.delete("/{enrollment_id}", response_model=EnrollmentResponse)
def cancel(
    enrollment_id: UUID,
    database: Session = Depends(get_db),
    actor: User = Depends(require_roles("student", "teacher", "admin")),
) -> Enrollment:
    """Cancel an enrollment without deleting its history."""

    return cancel_enrollment(database, enrollment_id, actor)
