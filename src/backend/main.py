from fastapi import FastAPI

from backend.database import Base, engine
from backend.models.application import ApplicationForm  # import so table is registered
from backend.models.users import User  # import so table is registered
from backend.api.application import router as application_router

app = FastAPI()

# create table (for prototype)
Base.metadata.create_all(bind=engine)

# register routes
app.include_router(application_router)
