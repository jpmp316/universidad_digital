"""Pydantic request and response schemas for users."""

from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.core.validators import validate_password_strength


class UserCreate(BaseModel):
    """Fields required to create a user."""

    email: EmailStr
    full_name: str = Field(min_length=2, max_length=120)
    password: str = Field(min_length=12, max_length=128)
    role_names: list[str] = Field(default_factory=lambda: ["student"], min_length=1)

    _validate_password = field_validator("password")(validate_password_strength)

    @field_validator("role_names")
    @classmethod
    def normalize_roles(cls, value: list[str]) -> list[str]:
        """Normalize role names and reject blank role entries."""

        normalized = sorted({role.strip().lower() for role in value})
        if not normalized or any(not role for role in normalized):
            raise ValueError("Debe indicar al menos un rol válido")
        return normalized


class UserUpdate(BaseModel):
    """Optional fields that an administrator may update."""

    email: EmailStr | None = None
    full_name: str | None = Field(default=None, min_length=2, max_length=120)
    password: str | None = Field(default=None, min_length=12, max_length=128)
    is_active: bool | None = None
    role_names: list[str] | None = Field(default=None, min_length=1)

    _validate_password = field_validator("password")(validate_password_strength)

    @field_validator("role_names")
    @classmethod
    def normalize_roles(cls, value: list[str] | None) -> list[str] | None:
        """Normalize optional role names and reject blank entries."""

        if value is None:
            return None
        normalized = sorted({role.strip().lower() for role in value})
        if not normalized or any(not role for role in normalized):
            raise ValueError("Debe indicar al menos un rol válido")
        return normalized


class UserResponse(BaseModel):
    """Public user representation that excludes password data."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email: EmailStr
    full_name: str
    is_active: bool
    role_names: list[str]