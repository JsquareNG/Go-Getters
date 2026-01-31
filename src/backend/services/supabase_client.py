# import os
# from dotenv import load_dotenv
# from supabase import create_client

# load_dotenv()  # ✅ loads .env from current working directory (or parent)

# SUPABASE_URL = os.getenv("SUPABASE_URL")
# SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
# BUCKET = os.getenv("SUPABASE_STORAGE_BUCKET", "application-docs")

# if not SUPABASE_URL:
#     raise RuntimeError("Missing SUPABASE_URL in .env")
# if not SUPABASE_SERVICE_ROLE_KEY:
#     raise RuntimeError("Missing SUPABASE_SERVICE_ROLE_KEY in .env")

# supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
BUCKET = os.getenv("SUPABASE_STORAGE_BUCKET", "application-docs")

if not SUPABASE_URL:
    raise RuntimeError("Missing SUPABASE_URL in .env")
if not SUPABASE_ANON_KEY:
    raise RuntimeError("Missing SUPABASE_ANON_KEY in .env")
if not SUPABASE_SERVICE_ROLE_KEY:
    raise RuntimeError("Missing SUPABASE_SERVICE_ROLE_KEY in .env")

# ✅ anon client (signed URLs, anything that should follow RLS)
supabase: Client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)

# ✅ admin client (service role, bypasses Storage RLS)
supabase_admin: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
