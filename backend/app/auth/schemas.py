"""Pydantic schemas for authentication requests."""

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.core.validators import validate_password_strength


class RegisterRequest(BaseModel):
    """Public registration fields; public users always receive the student role."""

    email: EmailStr
    full_name: str = Field(min_length=2, max_length=120)
    password: str = Field(min_length=12, max_length=128)

    _validate_password = field_validator("password")(validate_password_strength)


class LoginRequest(BaseModel):
    """Credentials used to start an authenticated session."""

    email: EmailStr
    password: str = Field(min_length=1, max_length=128)