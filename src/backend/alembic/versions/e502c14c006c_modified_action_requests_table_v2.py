"""modified action requests table v2

Revision ID: e502c14c006c
Revises: f5c5f524ad37
Create Date: 2026-04-14 12:46:54.262182

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'e502c14c006c'
down_revision: Union[str, Sequence[str], None] = 'f5c5f524ad37'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade():
    op.alter_column(
        "action_requests",
        "ocr_warnings",
        existing_type=postgresql.JSONB(),
        type_=sa.Boolean(),
        postgresql_using="""
            CASE
                WHEN ocr_warnings IS NULL THEN FALSE
                WHEN jsonb_typeof(ocr_warnings) = 'array' AND jsonb_array_length(ocr_warnings) > 0 THEN TRUE
                ELSE FALSE
            END
        """
    )


def downgrade():
    op.alter_column(
        "action_requests",
        "ocr_warnings",
        existing_type=sa.Boolean(),
        type_=postgresql.JSONB(),
        postgresql_using="""
            CASE
                WHEN ocr_warnings = TRUE THEN '["warning"]'::jsonb
                ELSE '[]'::jsonb
            END
        """
    )