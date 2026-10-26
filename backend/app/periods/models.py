"""ORM entities for academic periods."""

from datetime import date
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, Date, String
from sqlalchemy.orm import Mapped, mapped_column, relationship, validates

from app.database.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.enrollments.models import Enrollment


class AcademicPeriod(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """A bounded academic period used by enrollments."""

    __tablename__ = "academic_periods"

    name: Mapped[str] = mapped_column(String(80), unique=True, nullable=False)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    enrollments: Mapped[list["Enrollment"]] = relationship(back_populates="period")

    @validates("name")
    def validate_name(self, key: str, value: str) -> str:
        """Reject blank academic period names."""

        normalized = value.strip()
        if not normalized:
            raise ValueError("El nombre del periodo es obligatorio")
        return normalized