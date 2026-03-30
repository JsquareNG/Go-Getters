import os
from pathlib import Path
from dotenv import load_dotenv

TEST_ENV_PATH = Path(__file__).resolve().parent / ".env.test"
load_dotenv(TEST_ENV_PATH, override=True)

os.environ.setdefault("DATABASE_URL", "sqlite:///./test.db")