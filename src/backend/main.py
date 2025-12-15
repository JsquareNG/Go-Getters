from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session
from backend.database import SessionLocal
from backend.models.test import SME

app = FastAPI()

# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Route to fetch all SMEs
@app.get("/smes")
def read_smes(db: Session = Depends(get_db)):
    smes = db.query(SME).all()
    return smes
