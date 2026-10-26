"""Authentication endpoints."""

from fastapi import APIRouter, Depends, Response, status
from secrets import token_urlsafe
from sqlalchemy.orm import Session

from app.auth.schemas import LoginRequest, RegisterRequest
from app.auth.services import authenticate, register_student
from app.core.config import get_settings
from app.core.dependencies import CSRF_COOKIE_NAME, get_current_user, require_csrf
from app.database.session import get_db
from app.users.models import User
from app.users.schemas import UserResponse
from app.users.services import user_response_data

router = APIRouter(prefix="/auth", tags=["auth"])


def _set_auth_cookie(response: Response, token: str) -> None:
    """Set a secure, short-lived HttpOnly authentication cookie."""

    settings = get_settings()
    response.set_cookie(
        key=settings.cookie_name,
        value=token,
        max_age=settings.access_token_expire_minutes * 60,
        httponly=True,
        secure=settings.cookie_secure,
        samesite=settings.cookie_samesite,
    )
    response.set_cookie(
        key=CSRF_COOKIE_NAME,
        value=token_urlsafe(32),
        max_age=settings.access_token_expire_minutes * 60,
        httponly=False,
        secure=settings.cookie_secure,
        samesite=settings.cookie_samesite,
    )


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, database: Session = Depends(get_db)) -> UserResponse:
    """Register a least-privileged student account."""

    return UserResponse.model_validate(user_response_data(register_student(database, payload)))


@router.post("/login", response_model=UserResponse)
def login(payload: LoginRequest, response: Response, database: Session = Depends(get_db)) -> UserResponse:
    """Authenticate and issue the access token through an HttpOnly cookie."""

    user, token = authenticate(database, payload)
    _set_auth_cookie(response, token)
    return UserResponse.model_validate(user_response_data(user))


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_csrf)])
def logout(response: Response) -> None:
    """Revoke the browser session by clearing its cookie."""

    response.delete_cookie(get_settings().cookie_name)
    response.delete_cookie(CSRF_COOKIE_NAME)


@router.get("/me", response_model=UserResponse)
def me(current_user: User = Depends(get_current_user)) -> UserResponse:
    """Return the current public user profile."""

    return UserResponse.model_validate(user_response_data(current_user))