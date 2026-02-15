from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from backend.database import Base, engine
from backend.models.application import ApplicationForm  # import so table is registered
from backend.models.documents import Document
from backend.models.user import User
from backend.models.bellNotifications import BellNotification
from backend.api.user import router as user_router
from backend.api.application import router as application_router
from backend.api.document import router as application_document
from backend.api.bellNotification import router as application_bellNotifications

from backend.api.document_ai import router as docai_router
from backend.api.id_verification import router as idv_router

import os
from pathlib import Path
from dotenv import load_dotenv

# Always load src/backend/.env regardless of where uvicorn is launched from
ENV_PATH = Path(__file__).resolve().parent / ".env"
load_dotenv(dotenv_path=ENV_PATH)
# Ensure GOOGLE_APPLICATION_CREDENTIALS points to the real file
cred = os.getenv("GOOGLE_APPLICATION_CREDENTIALS", "")
if cred.startswith("./"):
    # interpret relative path as relative to backend/ (where this file lives)
    abs_cred = (Path(__file__).resolve().parent / cred.replace("./", "")).resolve()
    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = str(abs_cred)

app = FastAPI()

@app.get("/ping")
def ping():
    return {"ok": True}


@app.middleware("http")
async def log_requests(request: Request, call_next):
    print("INCOMING:", request.method, request.url.path)
    response = await call_next(request)
    print("DONE:", request.method, request.url.path, response.status_code)
    return response


# create table (for prototype)
# Base.metadata.create_all(bind=engine)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# register routes
app.include_router(application_router)
app.include_router(application_document)
app.include_router(user_router)  
app.include_router(application_bellNotifications)      


#add cors middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(docai_router)
app.include_router(idv_router)