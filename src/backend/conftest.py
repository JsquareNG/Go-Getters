import os
from pathlib import Path
from dotenv import load_dotenv

TEST_ENV_PATH = Path(__file__).resolve().parent / ".env.test"
load_dotenv(TEST_ENV_PATH, override=True)

os.environ.setdefault("DATABASE_URL", "postgresql://postgres:password@localhost:5432/test_db")
os.environ.setdefault("SUPABASE_URL", "https://example.supabase.co")
os.environ.setdefault("SUPABASE_ANON_KEY", "fake-anon-key")
os.environ.setdefault("SUPABASE_SERVICE_ROLE_KEY", "fake-service-role-key")
os.environ.setdefault("SUPABASE_KEY", "fake-key")
os.environ.setdefault("BUCKET", "test-bucket")
os.environ.setdefault("SENDGRID_API_KEY", "fake-sendgrid-key")
os.environ.setdefault("DIDIT_API_KEY", "fake-didit-key")
os.environ.setdefault("DIDIT_WORKFLOW_ID", "fake-workflow-id")