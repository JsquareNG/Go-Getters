def evaluate_indonesia_rules(company):

    score = 0
    triggers = []

    score += 20

    triggers.append({
        "code": "ID001",
        "description": "Foreign SME onboarding (Indonesia entity)",
        "score": 20
    })

    if not company.nib_present:

        score += 40
        triggers.append({
            "code": "ID002",
            "description": "NIB business license missing",
            "score": 40
        })

    if not company.npwp_present:

        score += 30
        triggers.append({
            "code": "ID003",
            "description": "NPWP tax number missing",
            "score": 30
        })

    return score, triggers