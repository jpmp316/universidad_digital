"""ORM entities for users, roles and the user-role association."""

from typing import TYPE_CHECKING
from uuid import UUID

from sqlalchemy import Boolean, ForeignKey, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship, validates

from app.database.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.enrollments.models import Enrollment
    from app.subjects.models import Subject


class Role(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """A named authorization role."""

    __tablename__ = "roles"

    name: Mapped[str] = mapped_column(String(30), unique=True, nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(String(255), nullable=True)
    users: Mapped[list["User"]] = relationship(secondary="user_roles", back_populates="roles")

    @validates("name")
    def validate_name(self, key: str, value: str) -> str:
        """Store role names in a stable lowercase form."""

        normalized = value.strip().lower()
        if not normalized:
            raise ValueError("El nombre del rol es obligatorio")
        return normalized


class UserRole(Base):
    """Many-to-many association between users and roles."""

    __tablename__ = "user_roles"

    user_id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    role_id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True)


class User(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """Application user without exposing the password hash in responses."""

    __tablename__ = "users"

    email: Mapped[str] = mapped_column(String(320), unique=True, nullable=False, index=True)
    full_name: Mapped[str] = mapped_column(String(120), nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    roles: Mapped[list[Role]] = relationship(secondary="user_roles", back_populates="users", lazy="selectin")
    enrollments: Mapped[list["Enrollment"]] = relationship(back_populates="student")
    teaching_subjects: Mapped[list["Subject"]] = relationship(
        secondary="subject_teachers", back_populates="teachers", lazy="selectin"
    )

    @validates("email")
    def validate_email(self, key: str, value: str) -> str:
        """Normalize email addresses before persistence."""

        normalized = value.strip().lower()
        if not normalized:
            raise ValueError("El correo electrónico es obligatorio")
        return normalized

    @validates("full_name")
    def validate_full_name(self, key: str, value: str) -> str:
        """Reject blank display names at the ORM boundary."""

        normalized = value.strip()
        if not normalized:
            raise ValueError("El nombre completo es obligatorio")
        return normalized