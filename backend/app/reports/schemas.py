"""Pydantic schemas for academic reports."""

from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel


class StudentReportResponse(BaseModel):
    """Summary of a student's academic activity."""

    student_id: UUID
    student_name: str
    total_enrollments: int
    active_enrollments: int
    total_grades: int
    average_grade: Decimal | None