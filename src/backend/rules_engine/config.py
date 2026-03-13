# config.py

# FATF High-Risk Jurisdictions (Call for Action)
FATF_BLACKLIST = {
    "Iran",
    "North Korea",
    "Myanmar"
}

# FATF Jurisdictions Under Increased Monitoring
HIGH_RISK_COUNTRIES = {
    "Algeria",
    "Angola",
    "Bolivia",
    "Bulgaria",
    "Cameroon",
    "Côte d'Ivoire",
    "Democratic Republic of the Congo",
    "Haiti",
    "Kenya",
    "Kuwait",
    "Lao PDR",
    "Lebanon",
    "Monaco",
    "Namibia",
    "Nepal",
    "Papua New Guinea",
    "South Sudan",
    "Syria",
    "Venezuela",
    "Vietnam",
    "British Virgin Islands",
    "Yemen"
}

HIGH_RISK_INDUSTRIES = {
    "Cryptocurrency",
    "Virtual Asset",
    "Money Services",
    "Remittance",
    "Foreign Exchange",
    "Gambling",
    "Casino",
    "Online Gaming",
    "Trading",
}

SIMPLIFIED_THRESHOLD = 30
STANDARD_THRESHOLD = 60


TX_VOLUME_RISK_TABLE = [
    (0, 1_000_000, 10),
    (1_000_000, 5_000_000, 30),
    (5_000_000, 10_000_000, 50),
    (10_000_000, float("inf"), 70)
]

COMPANY_AGE_RISK_TABLE = [
    (0, 1, 40),
    (1, 3, 25),
    (3, 10, 10),
    (10, float("inf"), 0)
]

OWNERSHIP_LAYER_RISK_TABLE = [
    (0, 2, 5),
    (3, 4, 25),
    (5, float("inf"), 50)
]

DIRECTOR_COUNT_RISK_TABLE = [
    (3, 5, 10),
    (6, float("inf"), 25)
]

TRANSACTION_COUNTRY_COUNT_TABLE = [
    (0, 2, 5),
    (3, 5, 10),
    (6, 10, 25),
    (11, float("inf"), 40)
]