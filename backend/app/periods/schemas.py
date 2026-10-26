"""Pydantic request and response schemas for academic periods."""

from datetime import date
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator


class PeriodCreate(BaseModel):
    """Fields required to create an academic period."""

    name: str = Field(min_length=2, max_length=80)
    start_date: date
    end_date: date

    @model_validator(mode="after")
    def validate_date_range(self) -> "PeriodCreate":
        """Ensure the period ends after it starts."""

        if self.end_date <= self.start_date:
            raise ValueError("end_date debe ser posterior a start_date")
        return self


class PeriodUpdate(BaseModel):
    """Optional fields that an administrator may update."""

    name: str | None = Field(default=None, min_length=2, max_length=80)
    start_date: date | None = None
    end_date: date | None = None
    is_active: bool | None = None


class PeriodResponse(BaseModel):
    """Public academic period representation."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    start_date: date
    end_date: date
    is_active: bool