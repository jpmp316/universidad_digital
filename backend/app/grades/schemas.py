"""Pydantic request and response schemas for grades."""

from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class GradeCreate(BaseModel):
    """Fields required to register an assessment grade."""

    enrollment_id: UUID
    assessment_name: str = Field(min_length=2, max_length=100)
    value: Decimal = Field(ge=0, le=100, decimal_places=2)


class GradeUpdate(BaseModel):
    """The mutable value of an assessment grade."""

    value: Decimal = Field(ge=0, le=100, decimal_places=2)


class GradeResponse(BaseModel):
    """Public grade representation."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    enrollment_id: UUID
    assessment_name: str
    value: Decimal
    is_active: bool
    graded_at: datetime