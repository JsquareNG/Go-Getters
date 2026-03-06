# config.py

# FATF High-Risk Jurisdictions (Call for Action)
# Banks normally trigger immediate Enhanced Due Diligence
FATF_BLACKLIST = {
    "Iran",
    "North Korea",
    "Myanmar"
}

# FATF Jurisdictions Under Increased Monitoring ("Grey List")
# These are countries with AML/CFT deficiencies requiring enhanced monitoring
HIGH_RISK_COUNTRIES = {
    "Bolivia",
    "Bulgaria",
    "Kenya",
    "Kuwait",
    "Lao PDR",
    "Lebanon",
    "South Sudan",
    "Syria",
    "Yemen",
    "Israel"
}

# Industries widely considered high risk by banks and AML regulators
HIGH_RISK_INDUSTRIES = {
    "Cryptocurrency Exchange",
    "Virtual Asset Service Provider",
    "Money Services Business",
    "Remittance",
    "Foreign Exchange",
    "Gambling",
    "Casino",
    "Online Gaming",
    "Precious Metals Trading",
    "Precious Stones Trading",
    "Arms Trading",
    "Adult Entertainment"
}

# Risk scoring thresholds used by the rule engine
SIMPLIFIED_THRESHOLD = 30
STANDARD_THRESHOLD = 60

# Expected transaction volume thresholds (example realistic SME banking values)
HIGH_TX_VOLUME_THRESHOLD = 1_000_000
VERY_HIGH_TX_VOLUME_THRESHOLD = 10_000_000

# Ownership complexity thresholds
MAX_SIMPLE_OWNERSHIP_LAYERS = 2

# Directorship threshold
MULTIPLE_DIRECTORSHIP_THRESHOLD = 5

# Newly incorporated company threshold
NEW_COMPANY_THRESHOLD_YEARS = 1