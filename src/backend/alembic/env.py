from logging.config import fileConfig

from sqlalchemy import engine_from_config
from sqlalchemy import pool
import os
from dotenv import load_dotenv
from backend.database import Base
from backend.models.application import ApplicationForm 
from backend.models.documents import Document
from backend.models.user import User
from backend.models.reviewJobs import ReviewJobs
from backend.models.bellNotifications import BellNotification
from backend.models.action_requests import ActionRequestItem, ActionRequest
from backend.models.auditTrail import AuditTrail
from backend.models.risk_config_list import RiskConfigList
from backend.models.risk_rule import RiskRule
from backend.models.risk_rule_condition import RiskRuleCondition
from backend.models.liveness_detection import LivenessDetection

from alembic import context

load_dotenv() 

config = context.config

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise Exception("DATABASE_URL not found in environment")

config.set_main_option("sqlalchemy.url", DATABASE_URL)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata

def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    This configures the context with just a URL
    and not an Engine, though an Engine is acceptable
    here as well.  By skipping the Engine creation
    we don't even need a DBAPI to be available.

    Calls to context.execute() here emit the given string to the
    script output.

    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode.

    In this scenario we need to create an Engine
    and associate a connection with the context.

    """
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection, target_metadata=target_metadata
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
