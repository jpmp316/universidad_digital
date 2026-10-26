"""ORM entities for enrollment grades."""

from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING
from uuid import UUID

from sqlalchemy import Boolean, DateTime, ForeignKey, Numeric, String, UniqueConstraint, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column, relationship, validates

from app.database.base import Base, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.enrollments.models import Enrollment


class Grade(UUIDPrimaryKeyMixin, Base):
    """A named assessment grade belonging to an enrollment."""

    __tablename__ = "grades"
    __table_args__ = (UniqueConstraint("enrollment_id", "assessment_name", name="uq_grade_enrollment_assessment"),)

    enrollment_id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("enrollments.id", ondelete="CASCADE"), nullable=False, index=True)
    assessment_name: Mapped[str] = mapped_column(String(100), nullable=False)
    value: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    graded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    enrollment: Mapped["Enrollment"] = relationship(back_populates="grades")

    @validates("assessment_name")
    def validate_assessment_name(self, key: str, value: str) -> str:
        """Normalize assessment names before enforcing uniqueness."""

        normalized = value.strip()
        if not normalized:
            raise ValueError("El nombre de evaluación es obligatorio")
        return normalized

    @validates("value")
    def validate_value(self, key: str, value: Decimal) -> Decimal:
        """Keep grades within the supported 0 to 100 range."""

        decimal_value = Decimal(value)
        if decimal_value < 0 or decimal_value > 100:
            raise ValueError("La calificación debe estar entre 0 y 100")
        return decimal_value