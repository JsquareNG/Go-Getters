"""edited app table

Revision ID: 3de8e1e83697
Revises: 412eb3c8f23e
Create Date: 2026-04-16 00:58:00.268674

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '3de8e1e83697'
down_revision: Union[str, Sequence[str], None] = '412eb3c8f23e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade():
    # Boolean flag
    op.add_column(
        "application_form",
        sa.Column(
            "document_warning",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
    )

    # JSONB result
    op.add_column(
        "application_form",
        sa.Column(
            "cross_validation_result",
            postgresql.JSONB(),
            nullable=True,
        ),
    )


def downgrade():
    op.drop_column("application_form", "cross_validation_result")
    op.drop_column("application_form", "document_warning")
    # ### end Alembic commands ###
