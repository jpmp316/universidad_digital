"""Reusable Pydantic field validation helpers."""


def validate_password_strength(value: str) -> str:
    """Require a password with mixed character classes."""

    if not any(character.isupper() for character in value):
        raise ValueError("La contraseña debe incluir una mayúscula")
    if not any(character.islower() for character in value):
        raise ValueError("La contraseña debe incluir una minúscula")
    if not any(character.isdigit() for character in value):
        raise ValueError("La contraseña debe incluir un número")
    return value