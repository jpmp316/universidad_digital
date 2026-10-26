"""Academic period endpoints."""

from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, require_csrf, require_roles
from app.database.session import get_db
from app.periods.models import AcademicPeriod
from app.periods.schemas import PeriodCreate, PeriodResponse, PeriodUpdate
from app.periods.services import create_period, deactivate_period, get_period, list_periods, update_period
from app.users.models import User

router = APIRouter(prefix="/periods", tags=["periods"], dependencies=[Depends(require_csrf)])


@router.post("/", response_model=PeriodResponse, status_code=status.HTTP_201_CREATED)
def create(
    payload: PeriodCreate,
    database: Session = Depends(get_db),
    _: User = Depends(require_roles("admin")),
) -> AcademicPeriod:
    """Create an academic period."""

    return create_period(database, payload)


@router.get("/", response_model=list[PeriodResponse])
def list_all(
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=100),
    database: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[AcademicPeriod]:
    """List academic periods."""

    return list_periods(database, offset, limit)


@router.get("/{period_id}", response_model=PeriodResponse)
def get_one(period_id: UUID, database: Session = Depends(get_db), _: User = Depends(get_current_user)) -> AcademicPeriod:
    """Get one academic period."""

    return get_period(database, period_id)


@router.put("/{period_id}", response_model=PeriodResponse)
def update(
    period_id: UUID,
    payload: PeriodUpdate,
    database: Session = Depends(get_db),
    _: User = Depends(require_roles("admin")),
) -> AcademicPeriod:
    """Update an academic period."""

    return update_period(database, period_id, payload)


@router.delete("/{period_id}", response_model=PeriodResponse)
def deactivate(period_id: UUID, database: Session = Depends(get_db), _: User = Depends(require_roles("admin"))) -> AcademicPeriod:
    """Deactivate an academic period while preserving history."""

    return deactivate_period(database, period_id)