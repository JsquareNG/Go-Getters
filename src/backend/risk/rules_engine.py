from __future__ import annotations
from dataclasses import dataclass
from typing import Any, Callable, Dict, List, Optional
from datetime import datetime, date

@dataclass
class RuleResult:
    rule_id: str
    name: str
    severity: str
    points: int
    reason: str

@dataclass
class EngineResult:
    score: int
    grade: str
    triggered: List[Dict[str, Any]]

def parse_date(value: Any) -> Optional[date]:
    if not value:
        return None
    if isinstance(value, date):
        return value
    try:
        return datetime.strptime(str(value), "%Y-%m-%d").date()
    except Exception:
        return None

class Rule:
    def __init__(
        self,
        rule_id: str,
        name: str,
        severity: str,
        points: int,
        predicate: Callable[[Dict[str, Any]], bool],
        reason: Callable[[Dict[str, Any]], str] | str,
    ):
        self.rule_id = rule_id
        self.name = name
        self.severity = severity
        self.points = points
        self.predicate = predicate
        self.reason = reason

    def evaluate(self, ctx: Dict[str, Any]) -> Optional[RuleResult]:
        if self.predicate(ctx):
            reason_text = self.reason(ctx) if callable(self.reason) else self.reason
            return RuleResult(self.rule_id, self.name, self.severity, self.points, reason_text)
        return None

class RulesEngine:
    def __init__(self, rules: List[Rule], thresholds: Dict[str, int]):
        self.rules = rules
        self.thresholds = thresholds

    def grade_from_score(self, score: int) -> str:
        low_max = self.thresholds.get("LOW_MAX", 24)
        med_max = self.thresholds.get("MED_MAX", 59)
        if score <= low_max:
            return "LOW"
        if score <= med_max:
            return "MEDIUM"
        return "HIGH"

    def run(self, ctx: Dict[str, Any]) -> EngineResult:
        triggered: List[RuleResult] = []
        score = 0

        for rule in self.rules:
            res = rule.evaluate(ctx)
            if res:
                triggered.append(res)
                score += max(0, res.points)

        return EngineResult(
            score=score,
            grade=self.grade_from_score(score),
            triggered=[r.__dict__ for r in triggered],
        )

def build_default_engine() -> RulesEngine:
    """
    Expects:
      ctx["business_country"] as ISO-ish code (e.g. "SG", "IDN", "IR") or name.
      ctx["business_type"] as one of: sole_proprietorship, partnership, private_limited, public_limited
      form_data["incorporation_date"] = "YYYY-MM-DD" (optional)
      form_data["ubo"] = list (optional)
      form_data["documents_uploaded"] = bool (optional)
      form_data["website"] = str (optional)
      form_data["pep_hit"] = bool (optional)
      form_data["sanctions_hit"] = bool (optional)
    """

    VALID_TYPES = {"sole_proprietorship", "partnership", "private_limited", "public_limited"}

    # FATF "black list" (Call for Action) as of 13 Feb 2026:
    # DPRK, Iran, Myanmar :contentReference[oaicite:1]{index=1}
    FATF_CALL_FOR_ACTION = {
        "KP", "PRK", "DPRK", "NORTH KOREA",
        "IR", "IRN", "IRAN",
        "MM", "MMR", "MYANMAR",
    }

    # FATF "grey list" (Increased Monitoring) as of 13 Feb 2026 :contentReference[oaicite:2]{index=2}
    FATF_INCREASED_MONITORING = {
        "DZ", "DZA", "ALGERIA",
        "AO", "AGO", "ANGOLA",
        "BO", "BOL", "BOLIVIA",
        "BG", "BGR", "BULGARIA",
        "CM", "CMR", "CAMEROON",
        "CI", "CIV", "COTE D'IVOIRE", "CÔTE D'IVOIRE",
        "CD", "COD", "DEMOCRATIC REPUBLIC OF THE CONGO", "DRC",
        "HT", "HTI", "HAITI",
        "KE", "KEN", "KENYA",
        "KW", "KWT", "KUWAIT",
        "LA", "LAO", "LAO PDR", "LAOS",
        "LB", "LBN", "LEBANON",
        "MC", "MCO", "MONACO",
        "NA", "NAM", "NAMIBIA",
        "NP", "NPL", "NEPAL",
        "PG", "PNG", "PAPUA NEW GUINEA",
        "SS", "SSD", "SOUTH SUDAN",
        "SY", "SYR", "SYRIA",
        "VE", "VEN", "VENEZUELA",
        "VN", "VNM", "VIETNAM",
        "VG", "VGB", "VIRGIN ISLANDS (UK)", "BRITISH VIRGIN ISLANDS",
        "YE", "YEM", "YEMEN",
    }

    def norm_country(x: Any) -> str:
        return (str(x or "").strip().upper())

    def fd(ctx):
        return ctx.get("form_data") or {}

    def invalid_type(ctx):
        bt = ctx.get("business_type")
        return (bt is None) or (str(bt).lower() not in VALID_TYPES)

    def country_is_black(ctx):
        c = norm_country(ctx.get("business_country"))
        return c in FATF_CALL_FOR_ACTION

    def country_is_grey(ctx):
        c = norm_country(ctx.get("business_country"))
        return c in FATF_INCREASED_MONITORING

    def is_missing_ubo(ctx):
        ubo = fd(ctx).get("ubo")
        return not ubo

    def ubo_count_low_for_company(ctx):
        bt = (ctx.get("business_type") or "").lower()
        if bt in {"private_limited", "public_limited"}:
            ubo = fd(ctx).get("ubo") or []
            return len(ubo) < 1
        return False

    def missing_documents(ctx):
        return not bool(fd(ctx).get("documents_uploaded", False))

    def website_missing(ctx):
        return (fd(ctx).get("website") or "").strip() == ""

    def pep_hit(ctx):
        return bool(fd(ctx).get("pep_hit", False))

    def sanctions_hit(ctx):
        return bool(fd(ctx).get("sanctions_hit", False))

    def incorporated_lt_1_year(ctx):
        inc = parse_date(fd(ctx).get("incorporation_date"))
        if not inc:
            return False
        return (date.today() - inc).days < 365

    def incorporated_lt_90_days(ctx):
        inc = parse_date(fd(ctx).get("incorporation_date"))
        if not inc:
            return False
        return (date.today() - inc).days < 90

    def is_sole_prop(ctx):
        return (ctx.get("business_type") or "").lower() == "sole_proprietorship"

    def is_partnership(ctx):
        return (ctx.get("business_type") or "").lower() == "partnership"

    def is_public_limited(ctx):
        return (ctx.get("business_type") or "").lower() == "public_limited"

    rules = [
        # Business type validation
        Rule("R040A", "Sole proprietorship baseline uplift", "LOW", 15, is_sole_prop,
            "Sole proprietorships generally require enhanced KYB due to single-controller risk."),

        Rule("R040B", "Partnership baseline uplift", "LOW", 20, is_partnership,
            "Partnerships may have less formal governance and require extra KYB checks."),

        Rule("R040C", "Public limited complexity uplift", "LOW", 5, is_public_limited,
            "Public limited entities may have more complex/fragmented ownership and control."),

        # Country risk (FATF-based)
        Rule("R100", "FATF Call for Action (black list) country", "HIGH", 100, country_is_black,
             lambda ctx: f"Country '{ctx.get('business_country')}' is on FATF Call for Action list."),
        Rule("R101", "FATF Increased Monitoring (grey list) country", "MEDIUM", 45, country_is_grey,
             lambda ctx: f"Country '{ctx.get('business_country')}' is on FATF Increased Monitoring list."),

        # Screening hits (your existing flags)
        Rule("R010", "Sanctions screening hit", "HIGH", 100, sanctions_hit,
             "Sanctions hit flagged in form_data (sanctions_hit=true)."),
        Rule("R011", "PEP screening hit", "HIGH", 60, pep_hit,
             "PEP hit flagged in form_data (pep_hit=true)."),

        # KYB completeness
        # Rule("R020", "Missing documents", "HIGH", 40, missing_documents,
        #      "Required documents not uploaded (documents_uploaded=false)."),
        Rule("R021", "Missing UBO information", "HIGH", 35, is_missing_ubo,
             "No UBO details provided in form_data['ubo']."),
        Rule("R022", "Insufficient UBO for company", "MEDIUM", 20, ubo_count_low_for_company,
             "Private/Public limited should provide at least 1 UBO."),

        # Incorporation age (your request)
        Rule("R032", "Incorporated < 1 year", "MEDIUM", 10, incorporated_lt_1_year,
             "Company incorporated within the last 1 year."),
        # Optional extra uplift for very new companies
        Rule("R030", "Incorporated < 90 days", "MEDIUM", 30, incorporated_lt_90_days,
             "Company incorporated within the last 90 days."),

        # Other light signals
        Rule("R031", "Missing website", "LOW", 8, website_missing,
             "Website missing in form data."),
    ]

    thresholds = {"LOW_MAX": 24, "MED_MAX": 59}
    return RulesEngine(rules=rules, thresholds=thresholds)