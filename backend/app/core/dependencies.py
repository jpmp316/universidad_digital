"""Reusable FastAPI dependencies for authentication and authorization."""

from collections.abc import Callable
from secrets import compare_digest
from uuid import UUID

from fastapi import Depends, Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.exceptions import AuthenticationError, AuthorizationError
from app.core.security import decode_access_token
from app.database.session import get_db
from app.users.models import Role, User, UserRole

CSRF_COOKIE_NAME = "csrf_token"


def get_current_user(request: Request, database: Session = Depends(get_db)) -> User:
    """Resolve the authenticated user from the HttpOnly access-token cookie."""

    from app.core.config import get_settings

    token = request.cookies.get(get_settings().cookie_name)
    if not token:
        raise AuthenticationError("Autenticación requerida")
    user_id = decode_access_token(token)
    user = database.get(User, user_id)
    if user is None or not user.is_active:
        raise AuthenticationError("Usuario no válido")
    return user


def require_roles(*allowed_roles: str) -> Callable[..., User]:
    """Build a dependency that enforces one of the supplied role names."""

    def dependency(
        current_user: User = Depends(get_current_user),
        database: Session = Depends(get_db),
    ) -> User:
        role_exists = database.scalar(
            select(Role.id)
            .join(UserRole, UserRole.role_id == Role.id)
            .where(UserRole.user_id == current_user.id, Role.name.in_(allowed_roles))
        )
        if role_exists is None:
            raise AuthorizationError("No tiene permisos para esta operación")
        return current_user

    return dependency


def require_csrf(request: Request) -> None:
    """Validate the double-submit CSRF token for state-changing requests."""

    if request.method not in {"POST", "PUT", "PATCH", "DELETE"}:
        return
    cookie_token = request.cookies.get(CSRF_COOKIE_NAME)
    header_token = request.headers.get("X-CSRF-Token")
    if not cookie_token or not header_token or not compare_digest(cookie_token, header_token):
        raise AuthorizationError("Token CSRF inválido")