from typing import Any, Dict, List

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.compliance_rules_engine.review_all_service import run_simulation_review

router = APIRouter(prefix="/simulation-testing", tags=["simulation-testing"])


class SimulationApplicationRecord(BaseModel):
    application_id: str
    form_data: Dict[str, Any] = Field(default_factory=dict)


class RunSimulationRequest(BaseModel):
    applications: List[SimulationApplicationRecord]

@router.post("/run")
def run_simulation(payload: RunSimulationRequest, db: Session = Depends(get_db)):
    results = run_simulation_review(
        records=[item.model_dump() for item in payload.applications],
        db=db,
    )

    return {
        "total": len(payload.applications),
        "success_count": sum(1 for r in results if r.get("success")),
        "failed_count": sum(1 for r in results if not r.get("success")),
        "results": results,
    }