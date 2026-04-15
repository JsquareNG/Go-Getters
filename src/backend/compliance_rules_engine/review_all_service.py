from datetime import datetime
from typing import Any, Dict, List

from sqlalchemy.orm import Session

from backend.compliance_rules_engine.application_service import submit_application
from backend.compliance_rules_engine.models import Company, Individual


def _safe_bool_yes(value: Any) -> bool:
    return str(value).strip().lower() == "yes"


def _safe_float(value: Any, default: float = 0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default

def _calculate_years_incorporated(registration_date_str: str | None) -> int:
    if not registration_date_str:
        return 1

    try:
        registration_date = datetime.strptime(registration_date_str, "%Y-%m-%d")
        today = datetime.today()

        years_incorporated = today.year - registration_date.year

        if (today.month, today.day) < (registration_date.month, registration_date.day):
            years_incorporated -= 1

        return max(years_incorporated, 0)

    except Exception:
        return 1


def build_company_from_form(form: Dict[str, Any]) -> Company:
    form = form or {}

    people = form.get("individuals", [])

    if isinstance(people, dict):
        people = [people]
    elif people is None:
        people = []
    elif not isinstance(people, list):
        raise ValueError(
            f"form['individuals'] must be a list or dict, got {type(people).__name__}"
        )

    individuals: List[Individual] = []
    for p in people:
        if not isinstance(p, dict):
            continue

        individuals.append(
            Individual(
                name=p.get("fullName"),
                nationality=p.get("nationality"),
                is_pep=_safe_bool_yes(p.get("pepDeclaration")),
                sanctions_declared=_safe_bool_yes(p.get("sanctionsDeclaration")),
                fatca_us_person=_safe_bool_yes(p.get("fatcaDeclaration")),
            )
        )

    expected_volume = _safe_float(form.get("expectedMonthlyTransactionVolume"), 0)
    years_incorporated = _calculate_years_incorporated(form.get("registrationDate"))
    expected_countries = form.get("expectedCountriesOfTransactionActivity", []) or []


    company = Company(
        name=form.get("businessName"),
        country=form.get("country"),
        industry=form.get("businessIndustry",""),
        entity_type=form.get("businessType"),

        years_incorporated=years_incorporated,

        annual_revenue=form.get("annualRevenue"),
        expected_tx_volume=expected_volume,

        ownership_layers=form.get("ownership_layers", 1),

        transaction_country_count=len(expected_countries),

        individuals=individuals,
        director_count=len(individuals),
    )

    return company


def run_simulation_review(records: List[Dict[str, Any]], db: Session) -> List[Dict[str, Any]]:
    """
    records format:
    [
      {
        "application_id": "APP-001",
        "form_data": { ...full application form data... }
      },
      ...
    ]
    """

    results = []

    for record in records:
        application_id = record.get("application_id")
        form = record.get("form_data") or {}

        try:
            company = build_company_from_form(form)
            engine_result = submit_application(company, db)

            results.append(
                {
                    "application_id": application_id,
                    "success": True,
                    "business_name": form.get("businessName"),
                    "country": form.get("country"),
                    "business_type": form.get("businessType"),
                    "risk_score": engine_result.get("risk_score"),
                    "risk_decision": engine_result.get("risk_decision"),
                    "triggered_rules": engine_result.get("triggered_rules", []),
                    "raw_result": engine_result,
                }
            )

        except Exception as e:
            results.append(
                {
                    "application_id": application_id,
                    "success": False,
                    "business_name": form.get("businessName"),
                    "country": form.get("country"),
                    "business_type": form.get("businessType"),
                    "error": str(e),
                }
            )

    return results