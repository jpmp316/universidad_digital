"""Add teacher ownership assignments for academic resources."""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

revision: str = "0002_subject_teacher_assignments"
down_revision: Union[str, None] = "0001_initial"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create the subject-teacher ownership association."""

    bind = op.get_bind()
    if not inspect(bind).has_table("subject_teachers"):
        op.create_table(
            "subject_teachers",
            sa.Column("subject_id", sa.Uuid(), nullable=False),
            sa.Column("teacher_id", sa.Uuid(), nullable=False),
            sa.ForeignKeyConstraint(["subject_id"], ["subjects.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["teacher_id"], ["users.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("subject_id", "teacher_id"),
        )
    if not any(index["name"] == "ix_subject_teachers_teacher_id" for index in inspect(bind).get_indexes("subject_teachers")):
        op.create_index("ix_subject_teachers_teacher_id", "subject_teachers", ["teacher_id"], unique=False)


def downgrade() -> None:
    """Remove the subject-teacher ownership association."""

    op.drop_index("ix_subject_teachers_teacher_id", table_name="subject_teachers")
    op.drop_table("subject_teachers")