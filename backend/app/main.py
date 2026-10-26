"""FastAPI application entry point."""

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.auth.routes import router as auth_router
from app.core.config import get_settings
from app.core.error_handlers import register_exception_handlers
from app.database.bootstrap import initialize_database, seed_roles
from app.enrollments.routes import router as enrollments_router
from app.grades.routes import router as grades_router
from app.periods.routes import router as periods_router
from app.reports.routes import router as reports_router
from app.subjects.routes import router as subjects_router
from app.users.routes import router as users_router

settings = get_settings()
settings.validate_runtime()


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncGenerator[None, None]:
	"""Initialize local database metadata and mandatory roles on startup."""

	if settings.is_production:
		seed_roles()
	else:
		initialize_database()
	yield


app = FastAPI(title=settings.app_name, version="1.0.0", lifespan=lifespan)
app.add_middleware(
	CORSMiddleware,
	allow_origins=settings.cors_origins,
	allow_credentials=True,
	allow_methods=["GET", "POST", "PUT", "DELETE"],
	allow_headers=["Content-Type", "X-CSRF-Token"],
)

register_exception_handlers(app)


@app.get("/health", tags=["system"])
def health() -> dict[str, str]:
	"""Report API process health without exposing infrastructure details."""

	return {"status": "ok"}


app.include_router(auth_router)
app.include_router(users_router)
app.include_router(subjects_router)
app.include_router(periods_router)
app.include_router(enrollments_router)
app.include_router(grades_router)
app.include_router(reports_router)
