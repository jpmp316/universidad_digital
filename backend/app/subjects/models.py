"""ORM entities for academic subjects."""

from typing import TYPE_CHECKING
from uuid import UUID

from uuid import UUID

from sqlalchemy import Boolean, ForeignKey, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship, validates

from app.database.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.enrollments.models import Enrollment
    from app.users.models import User


class SubjectTeacher(Base):
    """Association assigning teachers to subjects for ownership checks."""

    __tablename__ = "subject_teachers"

    subject_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("subjects.id", ondelete="CASCADE"), primary_key=True
    )
    teacher_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )


class Subject(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """A subject available for enrollment."""

    __tablename__ = "subjects"

    code: Mapped[str] = mapped_column(String(20), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    description: Mapped[str | None] = mapped_column(String(500), nullable=True)
    credits: Mapped[int] = mapped_column(nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    enrollments: Mapped[list["Enrollment"]] = relationship(back_populates="subject")
    teachers: Mapped[list["User"]] = relationship(
        secondary="subject_teachers", back_populates="teaching_subjects", lazy="selectin"
    )

    @validates("code")
    def validate_code(self, key: str, value: str) -> str:
        """Normalize and validate the subject code."""

        normalized = value.strip().upper()
        if not normalized:
            raise ValueError("El código de materia es obligatorio")
        return normalized

    @validates("name")
    def validate_name(self, key: str, value: str) -> str:
        """Reject blank subject names at the ORM boundary."""

        normalized = value.strip()
        if not normalized:
            raise ValueError("El nombre de materia es obligatorio")
        return normalized