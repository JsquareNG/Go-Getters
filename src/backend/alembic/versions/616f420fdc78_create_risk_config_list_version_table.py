from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "PUT_NEW_REVISION_ID_HERE"
down_revision: Union[str, Sequence[str], None] = "326bf837515d"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "risk_config_list_version",
        sa.Column("list_name", sa.String(length=100), primary_key=True),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=False),
            nullable=False,
            server_default=sa.text("(now() AT TIME ZONE 'Asia/Singapore')")
        ),
    )


def downgrade() -> None:
    op.drop_table("risk_config_list_version")