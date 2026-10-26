"""Pydantic request and response schemas for enrollments."""

from datetime import datetime
from enum import StrEnum
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class EnrollmentStatusSchema(StrEnum):
    """API representation of enrollment status."""

    ACTIVE = "active"
    CANCELLED = "cancelled"
    COMPLETED = "completed"


class EnrollmentCreate(BaseModel):
    """Fields required to enroll a student."""

    student_id: UUID
    subject_id: UUID
    period_id: UUID


class EnrollmentUpdate(BaseModel):
    """Fields that may change during the enrollment lifecycle."""

    status: EnrollmentStatusSchema


class EnrollmentResponse(BaseModel):
    """Enrollment representation with related resource identifiers."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    student_id: UUID
    student_name: str
    subject_id: UUID
    period_id: UUID
    status: EnrollmentStatusSchema
    enrolled_at: datetime
