"""Read-only academic report queries."""

from decimal import Decimal
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.exceptions import AuthorizationError, NotFoundError
from app.enrollments.models import Enrollment, EnrollmentStatus
from app.grades.models import Grade
from app.reports.schemas import StudentReportResponse
from app.subjects.models import SubjectTeacher
from app.users.models import User


def get_student_report(database: Session, student_id: UUID, actor: User) -> StudentReportResponse:
    """Build a basic academic summary visible to its owner or staff."""

    actor_roles = {role.name for role in actor.roles}
    if student_id != actor.id and not actor_roles.intersection({"admin", "teacher"}):
        raise AuthorizationError("No tiene acceso a este reporte")
    if "teacher" in actor_roles and "admin" not in actor_roles:
        assigned_student = database.scalar(
            select(Enrollment.id)
            .join(SubjectTeacher, SubjectTeacher.subject_id == Enrollment.subject_id)
            .where(Enrollment.student_id == student_id, SubjectTeacher.teacher_id == actor.id)
        )
        if assigned_student is None:
            raise AuthorizationError("El docente no está asignado a materias de este estudiante")
    student = database.get(User, student_id)
    if student is None:
        raise NotFoundError("Estudiante no encontrado")
    enrollment_stats = database.execute(
        select(
            func.count(Enrollment.id),
            func.count(Enrollment.id).filter(Enrollment.status == EnrollmentStatus.ACTIVE),
        ).where(Enrollment.student_id == student_id)
    ).one()
    grade_stats = database.execute(
        select(func.count(Grade.id), func.avg(Grade.value))
        .join(Enrollment, Grade.enrollment_id == Enrollment.id)
        .where(
            Enrollment.student_id == student_id,
            Enrollment.status != EnrollmentStatus.CANCELLED,
            Grade.is_active.is_(True),
        )
    ).one()
    average = Decimal(str(grade_stats[1])).quantize(Decimal("0.01")) if grade_stats[1] is not None else None
    return StudentReportResponse(
        student_id=student.id,
        student_name=student.full_name,
        total_enrollments=int(enrollment_stats[0]),
        active_enrollments=int(enrollment_stats[1]),
        total_grades=int(grade_stats[0]),
        average_grade=average,
    )
