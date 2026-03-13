def evaluate_singapore_rules(company):

    score = 0
    triggers = []

    if company.entity_type not in ["PTE_LTD", "LLP", "SOLE_PROPRIETORSHIP"]:

        score += 20
        triggers.append({
            "code": "SG001",
            "description": "Unsupported Singapore entity type",
            "score": 20
        })

    if not company.acra_profile:

        score += 30
        triggers.append({
            "code": "SG002",
            "description": "ACRA business profile missing",
            "score": 30
        })

    if not company.address_proof:

        score += 20
        triggers.append({
            "code": "SG003",
            "description": "Singapore business address proof missing",
            "score": 20
        })

    return score, triggers