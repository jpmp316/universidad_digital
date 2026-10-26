"""Business operations for authentication."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.schemas import LoginRequest, RegisterRequest
from app.core.exceptions import AuthenticationError, ConflictError
from app.core.security import create_access_token, verify_password
from app.users.models import Role, User
from app.users.schemas import UserCreate
from app.users.services import create_user


def register_student(database: Session, payload: RegisterRequest) -> User:
    """Register a public user with the least-privileged student role."""

    role = database.scalar(select(Role).where(Role.name == "student"))
    if role is None:
        raise ConflictError("El rol estudiante no está configurado")
    return create_user(
        database,
        UserCreate(email=payload.email, full_name=payload.full_name, password=payload.password, role_names=["student"]),
    )


def authenticate(database: Session, payload: LoginRequest) -> tuple[User, str]:
    """Verify credentials and return the user plus a short-lived access token."""

    user = database.scalar(select(User).where(User.email == str(payload.email).lower()))
    if user is None or not user.is_active or not verify_password(payload.password, user.password_hash):
        raise AuthenticationError("Credenciales inválidas")
    return user, create_access_token(user.id)