"""Centralized HTTP exception handlers."""

import logging

from fastapi import FastAPI, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError

from app.core.exceptions import AuthenticationError, AuthorizationError, ConflictError, DomainError, NotFoundError

logger = logging.getLogger(__name__)


def register_exception_handlers(application: FastAPI) -> None:
    """Register safe and consistent responses for expected and unexpected errors."""

    @application.exception_handler(AuthenticationError)
    async def authentication_error_handler(_: Request, error: AuthenticationError) -> JSONResponse:
        return JSONResponse(status_code=401, content={"detail": error.detail}, headers={"WWW-Authenticate": "Bearer"})

    @application.exception_handler(AuthorizationError)
    async def authorization_error_handler(_: Request, error: AuthorizationError) -> JSONResponse:
        return JSONResponse(status_code=403, content={"detail": error.detail})

    @application.exception_handler(NotFoundError)
    async def not_found_error_handler(_: Request, error: NotFoundError) -> JSONResponse:
        return JSONResponse(status_code=404, content={"detail": error.detail})

    @application.exception_handler(ConflictError)
    async def conflict_error_handler(_: Request, error: ConflictError) -> JSONResponse:
        return JSONResponse(status_code=409, content={"detail": error.detail})

    @application.exception_handler(DomainError)
    async def domain_error_handler(_: Request, error: DomainError) -> JSONResponse:
        return JSONResponse(status_code=400, content={"detail": error.detail})

    @application.exception_handler(RequestValidationError)
    async def request_validation_error_handler(_: Request, error: RequestValidationError) -> JSONResponse:
        return JSONResponse(status_code=422, content={"detail": jsonable_encoder(error.errors())})

    @application.exception_handler(SQLAlchemyError)
    async def database_error_handler(_: Request, error: SQLAlchemyError) -> JSONResponse:
        logger.exception("Database operation failed", exc_info=error)
        return JSONResponse(status_code=503, content={"detail": "Servicio de datos no disponible"})

    @application.exception_handler(Exception)
    async def unexpected_error_handler(_: Request, error: Exception) -> JSONResponse:
        logger.exception("Unhandled application error", exc_info=error)
        return JSONResponse(status_code=500, content={"detail": "Error interno del servidor"})