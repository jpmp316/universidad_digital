"""Academic report endpoints."""

from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.dependencies import require_roles
from app.database.session import get_db
from app.reports.schemas import StudentReportResponse
from app.reports.services import get_student_report
from app.users.models import User

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("/students/{student_id}", response_model=StudentReportResponse)
def student_report(
    student_id: UUID,
    database: Session = Depends(get_db),
    actor: User = Depends(require_roles("student", "teacher", "admin")),
) -> StudentReportResponse:
    """Return a basic academic summary."""

    return get_student_report(database, student_id, actor)