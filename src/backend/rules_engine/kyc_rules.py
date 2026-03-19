def evaluate_kyc_rules(individual):

    score = 0
    triggers = []

    if individual.sanctions_declared:

        score += 100
        triggers.append({
            "code": "KYC001",
            "description": f"{individual.name} sanctions exposure",
            "score": 100
        })

    if individual.is_pep:

        score += 50
        triggers.append({
            "code": "KYC002",
            "description": f"{individual.name} politically exposed person",
            "score": 50
        })

    if individual.fatca_us_person:

        score += 20
        triggers.append({
            "code": "KYC003",
            "description": f"{individual.name} FATCA US person",
            "score": 20
        })

    if not individual.tax_residency:

        score += 10
        triggers.append({
            "code": "KYC004",
            "description": f"{individual.name} missing tax residency",
            "score": 10
        })

    return score, triggers