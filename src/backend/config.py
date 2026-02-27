from datetime import timedelta

DRAFT_REMINDER_THRESHOLD = timedelta(hours=48)
#below fields are configurable
HIGH_RISK_JURISDICTIONS = {
    "CountryX",
    "CountryY"
}

HIGH_RISK_INDUSTRIES = {
    "Crypto",
    "Remittance",
    "Gambling"
}

SIMPLIFIED_CDD_THRESHOLD = 30
STANDARD_CDD_THRESHOLD = 60