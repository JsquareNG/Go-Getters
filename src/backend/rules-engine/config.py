from datetime import timedelta

DRAFT_REMINDER_THRESHOLD = timedelta(hours=48)
#below fields are configurable
HIGH_RISK_JURISDICTIONS = {
    "CountryX",
    "CountryY"
}

HIGH_RISK_INDUSTRIES = {
    "Crypto",
    "Investment",
    "Real Estate"
}
#incorporation date > 10 years
SIMPLIFIED_CDD_THRESHOLD = 30
STANDARD_CDD_THRESHOLD = 60