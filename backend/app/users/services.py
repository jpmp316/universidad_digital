"""Business operations for users and roles."""

from collections.abc import Sequence
from uuid import UUID

from sqlalchemy import or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.exceptions import ConflictError, NotFoundError
from app.core.security import hash_password
from app.users.models import Role, User
from app.users.schemas import UserCreate, UserUpdate


def user_response_data(user: User) -> dict[str, object]:
    """Build public user data without exposing password_hash."""

    return {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "is_active": user.is_active,
        "role_names": [role.name for role in user.roles],
    }


def _get_roles(database: Session, role_names: Sequence[str]) -> list[Role]:
    """Resolve role names and reject unknown privileges."""

    normalized_names = {name.strip().lower() for name in role_names}
    roles = list(database.scalars(select(Role).where(Role.name.in_(normalized_names))).all())
    if len(roles) != len(normalized_names):
        raise ConflictError("Uno o más roles no existen")
    return roles


def create_user(database: Session, payload: UserCreate) -> User:
    """Create a user with an administrator-selected role set."""

    roles = _get_roles(database, payload.role_names)
    user = User(
        email=str(payload.email).lower(),
        full_name=payload.full_name.strip(),
        password_hash=hash_password(payload.password),
        roles=roles,
    )
    database.add(user)
    try:
        database.commit()
    except IntegrityError as error:
        database.rollback()
        raise ConflictError("El correo electrónico ya está registrado") from error
    database.refresh(user)
    return user


def list_users(
    database: Session,
    offset: int,
    limit: int,
    *,
    search: str | None = None,
    role_name: str | None = None,
    active_only: bool = False,
) -> list[User]:
    """Return a bounded user page."""

    query = select(User)
    if active_only:
        query = query.where(User.is_active.is_(True))
    if search:
        pattern = f"%{search.strip()}%"
        query = query.where(or_(User.full_name.ilike(pattern), User.email.ilike(pattern)))
    if role_name:
        query = query.join(User.roles).where(Role.name == role_name.strip().lower()).distinct()
    query = query.order_by(User.created_at.desc()).offset(offset).limit(limit)
    return list(database.scalars(query).all())


def get_user(database: Session, user_id: UUID) -> User:
    """Return one user or raise a public not-found error."""

    user = database.get(User, user_id)
    if user is None:
        raise NotFoundError("Usuario no encontrado")
    return user


def update_user(database: Session, user_id: UUID, payload: UserUpdate) -> User:
    """Apply administrator-managed user changes."""

    user = get_user(database, user_id)
    values = payload.model_dump(exclude_unset=True)
    role_names = values.pop("role_names", None)
    password = values.pop("password", None)
    for field, value in values.items():
        setattr(user, field, str(value).lower() if field == "email" else value)
    if role_names is not None:
        user.roles = _get_roles(database, role_names)
    if password is not None:
        user.password_hash = hash_password(password)
    try:
        database.commit()
    except IntegrityError as error:
        database.rollback()
        raise ConflictError("El correo electrónico ya está registrado") from error
    database.refresh(user)
    return user


def deactivate_user(database: Session, user_id: UUID) -> User:
    """Deactivate a user instead of deleting audit-relevant data."""

    user = get_user(database, user_id)
    user.is_active = False
    database.commit()
    database.refresh(user)
    return user
