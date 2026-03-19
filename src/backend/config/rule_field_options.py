RULE_FIELD_OPTIONS = {
    "KYC": [
        {"value": "name", "label": "name", "kind": "string"},
        {"value": "nationality", "label": "nationality", "kind": "string"},
        {"value": "is_pep", "label": "is_pep", "kind": "boolean"},
        {"value": "sanctions_declared", "label": "sanctions_declared", "kind": "boolean"},
        {"value": "tax_residency", "label": "tax_residency", "kind": "boolean"},
        {"value": "fatca_us_person", "label": "fatca_us_person", "kind": "boolean"},
    ],
    "SG": [
        {"value": "entity_type", "label": "entity_type", "kind": "list"},
        {"value": "acra_profile", "label": "acra_profile", "kind": "boolean"},
        {"value": "address_proof", "label": "address_proof", "kind": "boolean"},
    ],
    "ID": [
        {"value": "country", "label": "country", "kind": "string"},
        {"value": "nib_present", "label": "nib_present", "kind": "boolean"},
        {"value": "npwp_present", "label": "npwp_present", "kind": "boolean"},
    ],
    "GENERAL": [
        {"value": "business_country", "label": "business_country", "kind": "list"},
        {"value": "industry", "label": "industry", "kind": "list"},
        {"value": "annual_revenue", "label": "annual_revenue", "kind": "number"},
        {"value": "expected_tx_volume", "label": "expected_tx_volume", "kind": "number"},
        {"value": "years_incorporated", "label": "years_incorporated", "kind": "number"},
        {"value": "ownership_layers", "label": "ownership_layers", "kind": "number"},
        {"value": "director_count", "label": "director_count", "kind": "number"},
        {"value": "transaction_country_count", "label": "transaction_country_count", "kind": "number"},
    ],
}