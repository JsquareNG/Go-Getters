from backend.rules_engine.config import HIGH_RISK_COUNTRIES


def evaluate_individual(person):

    score = 0
    triggers = []


    if person.is_pep:
        score += 40
        triggers.append({
            "code": "R001",
            "description": "Politically Exposed Person detected"
        })

    if person.nationality in HIGH_RISK_COUNTRIES:
        score += 20
        triggers.append({
            "code": "R002",
            "description": "Nationality from high-risk jurisdiction"
        })

    if person.is_signatory and person.ownership_pct < 25:
        score += 10
        triggers.append({
            "code": "R003",
            "description": "Account control without significant ownership"
        })

    if person.directorships > 5:
        score += 10
        triggers.append({
            "code": "R004",
            "description": "Individual holds multiple company directorships"
        })

    return score, triggers