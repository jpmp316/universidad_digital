"""Grade endpoints."""

from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.dependencies import require_csrf, require_roles
from app.database.session import get_db
from app.grades.models import Grade
from app.grades.schemas import GradeCreate, GradeResponse, GradeUpdate
from app.grades.services import create_grade, deactivate_grade, get_grade, list_grades, update_grade
from app.users.models import User

router = APIRouter(prefix="/grades", tags=["grades"], dependencies=[Depends(require_csrf)])


@router.post("/", response_model=GradeResponse, status_code=status.HTTP_201_CREATED)
def create(
    payload: GradeCreate,
    database: Session = Depends(get_db),
    actor: User = Depends(require_roles("teacher", "admin")),
) -> Grade:
    """Register a grade."""

    return create_grade(database, payload, actor)


@router.get("/enrollment/{enrollment_id}", response_model=list[GradeResponse])
def list_for_enrollment(
    enrollment_id: UUID,
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=100),
    database: Session = Depends(get_db),
    actor: User = Depends(require_roles("student", "teacher", "admin")),
) -> list[Grade]:
    """List grades for an enrollment visible to the actor."""

    return list_grades(database, enrollment_id, actor)[offset : offset + limit]


@router.get("/{grade_id}", response_model=GradeResponse)
def get_one(
    grade_id: UUID,
    database: Session = Depends(get_db),
    actor: User = Depends(require_roles("student", "teacher", "admin")),
) -> Grade:
    """Get one grade."""

    return get_grade(database, grade_id, actor)


@router.put("/{grade_id}", response_model=GradeResponse)
def update(
    grade_id: UUID,
    payload: GradeUpdate,
    database: Session = Depends(get_db),
    actor: User = Depends(require_roles("teacher", "admin")),
) -> Grade:
    """Update a grade value."""

    return update_grade(database, grade_id, payload, actor)


@router.delete("/{grade_id}", response_model=GradeResponse)
def deactivate(
    grade_id: UUID,
    database: Session = Depends(get_db),
    actor: User = Depends(require_roles("teacher", "admin")),
) -> Grade:
    """Deactivate a grade while preserving the academic record."""

    return deactivate_grade(database, grade_id, actor)