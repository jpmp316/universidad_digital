"""Pydantic request and response schemas for subjects."""

from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


class SubjectCreate(BaseModel):
    """Fields required to create a subject."""

    code: str = Field(min_length=2, max_length=20)
    name: str = Field(min_length=2, max_length=120)
    description: str | None = Field(default=None, max_length=500)
    credits: int = Field(ge=1, le=20)
    teacher_ids: list[UUID] = Field(default_factory=list, max_length=50)

    @field_validator("code")
    @classmethod
    def normalize_code(cls, value: str) -> str:
        """Normalize subject codes before persistence."""

        return value.strip().upper()


class SubjectUpdate(BaseModel):
    """Optional fields that an administrator may update."""

    code: str | None = Field(default=None, min_length=2, max_length=20)
    name: str | None = Field(default=None, min_length=2, max_length=120)
    description: str | None = Field(default=None, max_length=500)
    credits: int | None = Field(default=None, ge=1, le=20)
    is_active: bool | None = None
    teacher_ids: list[UUID] | None = Field(default=None, max_length=50)

    @field_validator("code")
    @classmethod
    def normalize_update_code(cls, value: str | None) -> str | None:
        """Normalize an optional subject code."""

        return value.strip().upper() if value is not None else None


class SubjectResponse(BaseModel):
    """Public subject representation."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    code: str
    name: str
    description: str | None
    credits: int
    is_active: bool
    teacher_ids: list[UUID]