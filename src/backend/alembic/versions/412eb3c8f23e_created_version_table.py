"""created version table

Revision ID: 412eb3c8f23e
Revises: e502c14c006c
Create Date: 2026-04-14 20:00:34.197726

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '412eb3c8f23e'
down_revision: Union[str, Sequence[str], None] = 'e502c14c006c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade():
    op.create_table(
        "risk_config_list_version",
        sa.Column("list_name", sa.String(length=100), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False, server_default=sa.text("1")),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=False),
            nullable=False,
            server_default=sa.text("(now() AT TIME ZONE 'Asia/Singapore')"),
        ),
        sa.PrimaryKeyConstraint("list_name"),
    )

    op.create_table(
        "risk_rule_category_version",
        sa.Column("category", sa.String(length=20), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False, server_default=sa.text("1")),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=False),
            nullable=False,
            server_default=sa.text("(now() AT TIME ZONE 'Asia/Singapore')"),
        ),
        sa.PrimaryKeyConstraint("category"),
    )


def downgrade():
    op.drop_table("risk_rule_category_version")
    op.drop_table("risk_config_list_version")