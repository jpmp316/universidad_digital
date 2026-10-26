"""Password hashing and signed access-token helpers."""

from datetime import datetime, timedelta, timezone
from typing import Any
from uuid import UUID

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import get_settings
from app.core.exceptions import AuthenticationError

password_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
DUMMY_PASSWORD_HASH = "$2b$12$C6UzMDM.H6dfI/f/IKcEe.7N0t8E0jL8i7XJx0Qe4fM7b7g8G7X2i"


def hash_password(password: str) -> str:
    """Hash a password using the recommended Argon2 configuration."""

    return password_context.hash(password)


def verify_password(password: str, hashed_password: str) -> bool:
    """Verify a plaintext password against its stored hash."""

    return password_context.verify(password, hashed_password or DUMMY_PASSWORD_HASH)


def create_access_token(subject: UUID) -> str:
    """Create a short-lived JWT whose subject is a user UUID."""

    settings = get_settings()
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_expire_minutes)
    payload: dict[str, Any] = {"sub": str(subject), "exp": expires_at}
    return jwt.encode(payload, settings.secret_key, algorithm="HS256")


def decode_access_token(token: str) -> UUID:
    """Decode and validate an access token."""

    try:
        payload = jwt.decode(token, get_settings().secret_key, algorithms=["HS256"])
        subject = payload.get("sub")
        if not isinstance(subject, str):
            raise AuthenticationError("Token inválido")
        return UUID(subject)
    except (JWTError, ValueError) as error:
        raise AuthenticationError("Token inválido o expirado") from error