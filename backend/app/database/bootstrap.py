"""Development bootstrap for database tables and required authorization roles."""

import logging

from sqlalchemy import select

from app.database.base import Base
from app.database.session import SessionLocal, engine
from app.enrollments.models import Enrollment
from app.grades.models import Grade
from app.periods.models import AcademicPeriod
from app.subjects.models import Subject
from app.core.security import verify_password
from app.users.models import Role, User, UserRole
from app.users.schemas import UserCreate
from app.users.services import create_user

logger = logging.getLogger(__name__)


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


def seed_initial_admin(email: str | None, password: str | None, full_name: str) -> None:
    """Create or promote the configured first administrator without a public endpoint."""

    if not email and not password:
        return
    if not email or not password:
        raise ValueError("BOOTSTRAP_ADMIN_EMAIL y BOOTSTRAP_ADMIN_PASSWORD deben configurarse juntos")

    normalized_email = email.strip().lower()
    database = SessionLocal()
    try:
        admin_role = database.scalar(select(Role).where(Role.name == "admin"))
        if admin_role is None:
            raise RuntimeError("El rol administrador no está configurado")

        existing_admin = database.scalar(select(User).join(User.roles).where(Role.name == "admin").limit(1))
        if existing_admin is not None:
            logger.info("Se omite la creación del administrador inicial: ya existe un administrador")
            return

        existing_user = database.scalar(select(User).where(User.email == normalized_email))
        if existing_user is not None:
            if not verify_password(password, existing_user.password_hash):
                raise ValueError("BOOTSTRAP_ADMIN_PASSWORD no coincide con la contraseña del usuario existente")
            existing_user.roles.append(admin_role)
            database.commit()
            logger.info("Se asignó el rol administrador al usuario inicial configurado")
            return

        create_user(
            database,
            UserCreate(email=normalized_email, full_name=full_name, password=password, role_names=["admin"]),
        )
        logger.info("Se creó el administrador inicial configurado")
    finally:
        database.close()
