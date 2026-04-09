from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from backend.database import Base, engine
from backend.models.application import ApplicationForm  # import so table is registered
from backend.models.documents import Document
from backend.models.user import User
from backend.models.bellNotifications import BellNotification
from backend.models.reviewJobs import ReviewJobs
from backend.models.auditTrail import AuditTrail
from backend.models.risk_config_list import RiskConfigList

from backend.api.user import router as user_router
from backend.api.application import router as application_router
from backend.api.document import router as application_document
from backend.api.bellNotification import router as application_bellNotifications
from backend.api.reviewJobs import router as review_jobs

from backend.api.extract import router as extract_router

from backend.api.auditTrail import router as audit_router
from backend.api.risk_config_list import router as risk_list_router
from backend.api.risk_rule import router as risk_rule_router
from backend.api.liveness_detection import router as live_detection_router
from backend.api.simulationTesting import router as sim_testing_router

from backend.api.didit_session import router as didit_session_router
from backend.api.smart_ai import router as smart_ai_router

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

#add cors middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://localhost:5176",
        "https://gogettersonboarding.netlify.app",
        ],
    # allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# register routes
app.include_router(application_router)
app.include_router(application_document)
app.include_router(user_router)  
app.include_router(application_bellNotifications)      
app.include_router(review_jobs)


app.include_router(extract_router)

app.include_router(audit_router)
app.include_router(risk_list_router)
app.include_router(risk_rule_router)

app.include_router(live_detection_router)
app.include_router(sim_testing_router)
app.include_router(didit_session_router)
app.include_router(smart_ai_router)