import os
import time
import mimetypes
from urllib.parse import urlparse

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

from supabase import create_client, Client
from supabase.client import ClientOptions


SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
SUPABASE_KYC_BUCKET = os.getenv("SUPABASE_KYC_BUCKET", "kyc-media")

if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
    raise RuntimeError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set")


supabase: Client = create_client(
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    options=ClientOptions(
        storage_client_timeout=60,
        postgrest_client_timeout=20,
        schema="public",
    ),
)


def _build_requests_session() -> requests.Session:
    session = requests.Session()

    retry = Retry(
        total=3,
        connect=3,
        read=3,
        backoff_factor=1.0,
        status_forcelist=[429, 500, 502, 503, 504],
        allowed_methods=["GET"],
        raise_on_status=False,
    )

    adapter = HTTPAdapter(max_retries=retry, pool_connections=10, pool_maxsize=10)
    session.mount("http://", adapter)
    session.mount("https://", adapter)
    return session


requests_session = _build_requests_session()


def download_file_bytes(source_url: str) -> tuple[bytes, str]:
    response = requests_session.get(source_url, timeout=(10, 60))
    response.raise_for_status()

    content_type = response.headers.get("Content-Type", "application/octet-stream")
    return response.content, content_type


def guess_extension(source_url: str, content_type: str, fallback_ext: str = "") -> str:
    path = urlparse(source_url).path
    ext = os.path.splitext(path)[1]
    if ext:
        return ext

    guessed = mimetypes.guess_extension(content_type.split(";")[0].strip())
    if guessed:
        return guessed

    return fallback_ext


def build_kyc_storage_path(application_id: str, target_name: str, ext: str) -> str:
    safe_app_id = (application_id or "unknown-app").strip()
    return f"{safe_app_id}/{target_name}{ext}"


def upload_bytes_to_kyc_bucket(
    file_bytes: bytes,
    content_type: str,
    application_id: str,
    target_name: str,
    source_url: str,
    fallback_ext: str = "",
    retries: int = 3,
) -> str:
    ext = guess_extension(source_url, content_type, fallback_ext)
    storage_path = build_kyc_storage_path(application_id, target_name, ext)

    last_error = None

    for attempt in range(1, retries + 1):
        try:
            print(
                f"[KYC UPLOAD] attempt={attempt}/{retries} "
                f"path={storage_path} content_type={content_type} bytes={len(file_bytes)}"
            )

            supabase.storage.from_(SUPABASE_KYC_BUCKET).upload(
                path=storage_path,
                file=file_bytes,
                file_options={
                    "content-type": content_type,
                    "upsert": "true",
                },
            )

            print(f"[KYC UPLOAD] success path={storage_path}")
            return storage_path

        except Exception as e:
            last_error = e
            print(f"[KYC UPLOAD] failed attempt={attempt} path={storage_path} error={repr(e)}")

            if attempt < retries:
                time.sleep(attempt * 1.5)
            else:
                break

    raise RuntimeError(f"Failed to upload file to Supabase after {retries} attempts: {last_error}")


def get_kyc_public_url(storage_path: str) -> str:
    result = supabase.storage.from_(SUPABASE_KYC_BUCKET).get_public_url(storage_path)

    if isinstance(result, str):
        return result

    if isinstance(result, dict):
        return (
            result.get("publicURL")
            or result.get("publicUrl")
            or result.get("data", {}).get("publicUrl")
            or result.get("data", {}).get("publicURL")
        )

    return f"{SUPABASE_URL}/storage/v1/object/public/{SUPABASE_KYC_BUCKET}/{storage_path}"


def download_upload_and_get_kyc_public_url(
    source_url: str | None,
    application_id: str,
    target_name: str,
    fallback_ext: str = "",
) -> str | None:
    if not source_url:
        return None

    file_bytes, content_type = download_file_bytes(source_url)

    storage_path = upload_bytes_to_kyc_bucket(
        file_bytes=file_bytes,
        content_type=content_type,
        application_id=application_id,
        target_name=target_name,
        source_url=source_url,
        fallback_ext=fallback_ext,
    )

    return get_kyc_public_url(storage_path)