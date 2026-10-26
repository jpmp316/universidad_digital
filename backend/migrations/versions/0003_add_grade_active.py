"""Ensure grades support logical deactivation."""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

revision: str = "0003_add_grade_active"
down_revision: Union[str, None] = "0002_subject_teacher_assignments"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add the active flag when upgrading an older database."""

    bind = op.get_bind()
    grade_columns = {column["name"] for column in inspect(bind).get_columns("grades")}
    if "is_active" not in grade_columns:
        op.add_column("grades", sa.Column("is_active", sa.Boolean(), nullable=True, server_default=sa.true()))
        op.execute("UPDATE grades SET is_active = TRUE WHERE is_active IS NULL")
        op.alter_column("grades", "is_active", nullable=False, server_default=sa.true())


def downgrade() -> None:
    """Remove the logical-deletion flag."""

    op.drop_column("grades", "is_active")