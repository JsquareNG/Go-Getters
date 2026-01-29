from fastapi import FastAPI

from backend.database import Base, engine
from backend.models.application import ApplicationForm
from backend.models.user import User
from backend.api.application import router as application_router
from backend.api.user import router as user_router
from fastapi.middleware.cors import CORSMiddleware


app = FastAPI()

# create table (for prototype)
Base.metadata.create_all(bind=engine)

# register routes
app.include_router(application_router)
app.include_router(user_router)      

#add cors middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)