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