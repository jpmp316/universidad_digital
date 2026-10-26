"""Development bootstrap for database tables and required authorization roles."""

from sqlalchemy import select

from app.database.base import Base
from app.database.session import SessionLocal, engine
from app.enrollments.models import Enrollment
from app.grades.models import Grade
from app.periods.models import AcademicPeriod
from app.subjects.models import Subject
from app.users.models import Role, User, UserRole


def initialize_database() -> None:
    """Create local tables and seed the fixed role vocabulary."""

    Base.metadata.create_all(bind=engine)
    seed_roles()


def seed_roles() -> None:
    """Ensure the fixed authorization vocabulary exists."""

    database = SessionLocal()
    try:
        existing_roles = set(database.scalars(select(Role.name)).all())
        for role_name, description in (
            ("admin", "Administración del sistema"),
            ("teacher", "Gestión docente y calificaciones"),
            ("student", "Acceso académico del estudiante"),
        ):
            if role_name not in existing_roles:
                database.add(Role(name=role_name, description=description))
        database.commit()
    finally:
        database.close()