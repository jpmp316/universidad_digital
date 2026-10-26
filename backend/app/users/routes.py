"""User administration endpoints."""

from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.dependencies import require_csrf, require_roles
from app.database.session import get_db
from app.users.models import User
from app.users.schemas import UserCreate, UserResponse, UserUpdate
from app.users.services import create_user, deactivate_user, get_user, list_users, update_user, user_response_data

router = APIRouter(prefix="/users", tags=["users"], dependencies=[Depends(require_csrf)])


@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create(
    payload: UserCreate,
    database: Session = Depends(get_db),
    _: User = Depends(require_roles("admin")),
) -> UserResponse:
    """Create a user with administrator-selected roles."""

    return UserResponse.model_validate(user_response_data(create_user(database, payload)))


@router.get("/", response_model=list[UserResponse])
def list_all(
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=100),
    search: str | None = Query(default=None, min_length=2, max_length=120),
    role_name: str | None = Query(default=None, min_length=2, max_length=30),
    active_only: bool = False,
    database: Session = Depends(get_db),
    _: User = Depends(require_roles("admin")),
) -> list[UserResponse]:
    """List users with bounded pagination."""

    return [
        UserResponse.model_validate(user_response_data(user))
        for user in list_users(database, offset, limit, search=search, role_name=role_name, active_only=active_only)
    ]


@router.get("/{user_id}", response_model=UserResponse)
def get_one(user_id: UUID, database: Session = Depends(get_db), _: User = Depends(require_roles("admin"))) -> UserResponse:
    """Get one user by identifier."""

    return UserResponse.model_validate(user_response_data(get_user(database, user_id)))


@router.put("/{user_id}", response_model=UserResponse)
def update(
    user_id: UUID,
    payload: UserUpdate,
    database: Session = Depends(get_db),
    _: User = Depends(require_roles("admin")),
) -> UserResponse:
    """Update administrator-managed fields."""

    return UserResponse.model_validate(user_response_data(update_user(database, user_id, payload)))


@router.delete("/{user_id}", response_model=UserResponse)
def deactivate(user_id: UUID, database: Session = Depends(get_db), _: User = Depends(require_roles("admin"))) -> UserResponse:
    """Deactivate a user without deleting audit history."""

    return UserResponse.model_validate(user_response_data(deactivate_user(database, user_id)))
