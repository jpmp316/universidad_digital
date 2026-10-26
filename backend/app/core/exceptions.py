"""Application exceptions that are safe to expose through the API."""


class DomainError(Exception):
    """Base error for expected business rule violations."""

    def __init__(self, detail: str) -> None:
        self.detail = detail
        super().__init__(detail)


class ConflictError(DomainError):
    """Raised when a resource conflicts with existing data."""


class NotFoundError(DomainError):
    """Raised when a requested resource does not exist."""


class AuthenticationError(DomainError):
    """Raised when authentication credentials are invalid."""


class AuthorizationError(DomainError):
    """Raised when a principal lacks the required role."""