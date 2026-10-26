"""Application settings loaded from environment variables."""

from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv
from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict

load_dotenv(Path(__file__).resolve().parents[2] / ".env")


class Settings(BaseSettings):
    """Typed runtime configuration for the API."""

    app_name: str = Field(default="Universidad Digital API", validation_alias=AliasChoices("APP_NAME", "app_name"))
    environment: str = Field(default="development", validation_alias=AliasChoices("APP_ENV", "ENVIRONMENT"))
    database_url: str = Field(validation_alias=AliasChoices("DATABASE_URL"))
    secret_key: str = Field(
        min_length=32,
        validation_alias=AliasChoices("APP_JWT_SECRET", "JWT_SECRET", "SECRET_KEY"),
    )
    access_token_expire_minutes: int = Field(
        default=30,
        gt=0,
        validation_alias=AliasChoices("APP_JWT_EXPIRATION", "JWT_EXPIRATION", "ACCESS_TOKEN_EXPIRE_MINUTES"),
    )
    cookie_name: str = Field(default="access_token", validation_alias=AliasChoices("APP_COOKIE_NAME", "COOKIE_NAME"))
    cookie_secure: bool = Field(default=False, validation_alias=AliasChoices("APP_COOKIE_SECURE", "COOKIE_SECURE"))
    cookie_samesite: str = Field(
        default="lax",
        pattern="^(lax|strict|none)$",
        validation_alias=AliasChoices("APP_COOKIE_SAMESITE", "COOKIE_SAMESITE"),
    )
    cors_origins_value: str = Field(
        default="",
        validation_alias=AliasChoices("APP_CORS_ORIGINS", "FRONTEND_ORIGIN"),
    )
    bootstrap_admin_email: str | None = Field(default=None, validation_alias="BOOTSTRAP_ADMIN_EMAIL")
    bootstrap_admin_password: str | None = Field(default=None, validation_alias="BOOTSTRAP_ADMIN_PASSWORD")
    bootstrap_admin_name: str = Field(default="Administrador inicial", validation_alias="BOOTSTRAP_ADMIN_NAME")

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    @property
    def cors_origins(self) -> list[str]:
        """Return the configured CORS allowlist as normalized origins."""

        configured = [origin.strip() for origin in self.cors_origins_value.split(",") if origin.strip()]
        if self.is_production:
            return configured
        return list(dict.fromkeys(["http://localhost:3000", "http://localhost:5173", *configured]))

    @property
    def is_production(self) -> bool:
        """Return whether production security rules must be enforced."""

        return self.environment.lower() == "production"

    @property
    def sqlalchemy_database_url(self) -> str:
        """Use the installed psycopg 3 driver for PostgreSQL URLs."""

        if self.database_url.startswith("postgres://"):
            return self.database_url.replace("postgres://", "postgresql+psycopg://", 1)
        if self.database_url.startswith("postgresql://"):
            return self.database_url.replace("postgresql://", "postgresql+psycopg://", 1)
        return self.database_url

    def validate_runtime(self) -> None:
        """Reject unsafe production configuration before accepting traffic."""

        if self.environment.lower() not in {"development", "production"}:
            raise ValueError("APP_ENV debe ser development o production")
        if self.is_production and not self.cookie_secure:
            raise ValueError("APP_COOKIE_SECURE debe ser true en production")
        if self.is_production and not self.cors_origins:
            raise ValueError("APP_CORS_ORIGINS es obligatorio en production")
        if bool(self.bootstrap_admin_email) != bool(self.bootstrap_admin_password):
            raise ValueError("BOOTSTRAP_ADMIN_EMAIL y BOOTSTRAP_ADMIN_PASSWORD deben configurarse juntos")


@lru_cache
def get_settings() -> Settings:
    """Return the cached application settings."""

    return Settings()
