from models import Individual
from config import HIGH_RISK_JURISDICTIONS

def score_individual_risk(person: Individual) -> int:
    score = 0

    if person.nationality in HIGH_RISK_JURISDICTIONS:
        score += 20

    if person.is_pep:
        score += 40

    if person.has_adverse_media:
        score += 30

    return score

