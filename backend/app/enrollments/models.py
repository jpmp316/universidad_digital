"""ORM entities for student enrollments."""

from datetime import datetime
from enum import StrEnum
from typing import TYPE_CHECKING
from uuid import UUID

from sqlalchemy import DateTime, ForeignKey, String, UniqueConstraint, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column, relationship, validates

from app.database.base import Base, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.grades.models import Grade
    from app.periods.models import AcademicPeriod
    from app.subjects.models import Subject
    from app.users.models import User


class EnrollmentStatus(StrEnum):
    """Allowed enrollment lifecycle states."""

    ACTIVE = "active"
    CANCELLED = "cancelled"
    COMPLETED = "completed"


class Enrollment(UUIDPrimaryKeyMixin, Base):
    """A student's enrollment in one subject and academic period."""

    __tablename__ = "enrollments"
    __table_args__ = (UniqueConstraint("student_id", "subject_id", "period_id", name="uq_enrollment_student_subject_period"),)

    student_id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True)
    subject_id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("subjects.id", ondelete="RESTRICT"), nullable=False, index=True)
    period_id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("academic_periods.id", ondelete="RESTRICT"), nullable=False, index=True)
    status: Mapped[EnrollmentStatus] = mapped_column(String(20), default=EnrollmentStatus.ACTIVE, nullable=False)
    enrolled_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    student: Mapped["User"] = relationship(back_populates="enrollments")
    subject: Mapped["Subject"] = relationship(back_populates="enrollments")
    period: Mapped["AcademicPeriod"] = relationship(back_populates="enrollments")
    grades: Mapped[list["Grade"]] = relationship(back_populates="enrollment", cascade="all, delete-orphan")

    @property
    def student_name(self) -> str:
        """Expose the related student's name in enrollment responses."""

        return self.student.full_name

    @validates("status")
    def validate_status(self, key: str, value: EnrollmentStatus | str) -> EnrollmentStatus:
        """Persist only supported enrollment lifecycle states."""

        return EnrollmentStatus(value)
