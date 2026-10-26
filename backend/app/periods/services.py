"""Business operations for academic periods."""

from datetime import date
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.exceptions import ConflictError, NotFoundError
from app.periods.models import AcademicPeriod
from app.periods.schemas import PeriodCreate, PeriodUpdate


def _validate_dates(start_date: date, end_date: date) -> None:
    """Validate the invariant shared by create and update operations."""

    if end_date <= start_date:
        raise ConflictError("end_date debe ser posterior a start_date")


def create_period(database: Session, payload: PeriodCreate) -> AcademicPeriod:
    """Create an academic period."""

    values = payload.model_dump()
    values["name"] = payload.name.strip()
    period = AcademicPeriod(**values)
    database.add(period)
    try:
        database.commit()
    except IntegrityError as error:
        database.rollback()
        raise ConflictError("El nombre del periodo ya existe") from error
    database.refresh(period)
    return period


def list_periods(database: Session, offset: int, limit: int) -> list[AcademicPeriod]:
    """Return a bounded period page."""

    return list(database.scalars(select(AcademicPeriod).order_by(AcademicPeriod.start_date.desc()).offset(offset).limit(limit)).all())


def get_period(database: Session, period_id: UUID) -> AcademicPeriod:
    """Return one academic period or raise not found."""

    period = database.get(AcademicPeriod, period_id)
    if period is None:
        raise NotFoundError("Periodo académico no encontrado")
    return period


def update_period(database: Session, period_id: UUID, payload: PeriodUpdate) -> AcademicPeriod:
    """Update period data while preserving date ordering."""

    period = get_period(database, period_id)
    values = payload.model_dump(exclude_unset=True)
    start_date = values.get("start_date", period.start_date)
    end_date = values.get("end_date", period.end_date)
    _validate_dates(start_date, end_date)
    for field, value in values.items():
        setattr(period, field, value.strip() if isinstance(value, str) else value)
    try:
        database.commit()
    except IntegrityError as error:
        database.rollback()
        raise ConflictError("No se pudo actualizar el periodo") from error
    database.refresh(period)
    return period


def deactivate_period(database: Session, period_id: UUID) -> AcademicPeriod:
    """Deactivate a period without deleting enrollment history."""

    period = get_period(database, period_id)
    period.is_active = False
    database.commit()
    database.refresh(period)
    return period