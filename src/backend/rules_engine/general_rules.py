from datetime import datetime
from config import *
from utils import calculate_range_score


def evaluate_general_rules(company):

    score = 0
    triggers = []

    if company.country in FATF_BLACKLIST:

        score += 100
        triggers.append({
            "code": "R001",
            "description": "Company in FATF blacklist country",
            "score": 100
        })

    elif company.country in HIGH_RISK_COUNTRIES:

        score += 40
        triggers.append({
            "code": "R002",
            "description": "Company in FATF grey list country",
            "score": 40
        })

    if company.industry in HIGH_RISK_INDUSTRIES:

        score += 30
        triggers.append({
            "code": "R003",
            "description": "High risk industry",
            "score": 30
        })

    age = datetime.now().year - company.registration_year

    age_score = calculate_range_score(age, COMPANY_AGE_RISK_TABLE)

    if age_score > 0:
        score += age_score
        triggers.append({
            "code": "R100",
            "description": f"Company age risk ({age} years)",
            "score": age_score
        })

    volume_score = calculate_range_score(
        company.expected_tx_volume,
        TX_VOLUME_RISK_TABLE
    )

    if volume_score > 0:

        score += volume_score
        triggers.append({
            "code": "R200",
            "description": "Transaction volume risk tier",
            "score": volume_score
        })
    
    complexity_score = calculate_range_score(
        company.ownership_layers,
        OWNERSHIP_LAYER_RISK_TABLE
    )

    if complexity_score > 0:

        score += complexity_score

        triggers.append({
            "code": "R300",
            "description": f"Ownership complexity ({company.ownership_layers} layers)",
            "score": complexity_score
        })

    director_score = calculate_range_score(
        len(company.individuals),
        DIRECTOR_COUNT_RISK_TABLE
    )

    if director_score > 0:

        score += director_score

        triggers.append({
            "code": "R301",
            "description": "Director count risk",
            "score": director_score
        })
    
    country_score = calculate_range_score(
        len(company.transaction_countries),
        TRANSACTION_COUNTRY_COUNT_TABLE
    )

    if country_score > 0:

        score += country_score

        triggers.append({
            "code": "R400",
            "description": "Wide geographic transaction exposure",
            "score": country_score
        })


    return score, triggers