from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session, joinedload

from backend.database import get_db
from backend.models.risk_rule import RiskRule
from backend.models.risk_rule_condition import RiskRuleCondition

router = APIRouter(prefix="/risk-rules", tags=["risk-rules"])

def condition_to_dict(c):
    return {
        "condition_id": c.id,
        "condition_group": c.condition_group,
        "order_no": c.order_no,
        "field_name": c.field_name,
        "operator": c.operator,
        "value_type": c.value_type,
        "numeric_value": c.numeric_value,
        "string_value": c.string_value,
        "boolean_value": c.boolean_value,
        "list_name": c.list_name,
        "score": c.score,
        "trigger_description": c.trigger_description,
        "is_active": c.is_active,
    }

def rule_to_dict(rule):
    return {
        "rule_id": rule.id,
        "rule_code": rule.rule_code,
        "rule_name": rule.rule_name,
        "category": rule.category,
        "description": rule.description,
        "is_active": rule.is_active,
        "updated_at": rule.updated_at,
        "conditions": [condition_to_dict(c) for c in rule.conditions],
    }

@router.get("/byCategory/{category}")
def get_rules_by_category(category: str, db: Session = Depends(get_db)):

    rows = (
        db.query(RiskRule)
        .options(joinedload(RiskRule.conditions))
        .filter(RiskRule.category == category.upper())
        .order_by(RiskRule.rule_code.asc())
        .all()
    )

    return [rule_to_dict(r) for r in rows]

@router.get("/activeByCategory/{category}")
def get_active_rules_by_category(category: str, db: Session = Depends(get_db)):

    category = category.upper()

    rows = (
        db.query(RiskRule)
        .options(joinedload(RiskRule.conditions))
        .filter(
            RiskRule.category == category,
            RiskRule.is_active == True
        )
        .order_by(RiskRule.rule_code.asc())
        .all()
    )

    return [rule_to_dict(r) for r in rows]

@router.put("/saveChanges")
def save_risk_rule_changes(payload: dict = Body(...), db: Session = Depends(get_db)):
    try:

        rule_updates = payload.get("rules", [])
        condition_updates = payload.get("conditions", [])

        # -----------------------------
        # Update rules
        # -----------------------------
        for item in rule_updates:

            rule = db.query(RiskRule).filter(RiskRule.id == item["rule_id"]).first()

            if not rule:
                continue

            if "rule_name" in item:
                rule.rule_name = item["rule_name"]

            if "description" in item:
                rule.description = item["description"]

            if "is_active" in item:
                rule.is_active = item["is_active"]

                # If rule becomes inactive → all conditions inactive
                if item["is_active"] is False:
                    for c in rule.conditions:
                        c.is_active = False

                # If rule becomes active and all conditions inactive → activate all
                if item["is_active"] is True:
                    all_inactive = all(not c.is_active for c in rule.conditions)

                    if all_inactive:
                        for c in rule.conditions:
                            c.is_active = True

        # -----------------------------
        # Update conditions
        # -----------------------------
        touched_rules = set()

        for item in condition_updates:

            condition = (
                db.query(RiskRuleCondition)
                .filter(RiskRuleCondition.id == item["condition_id"])
                .first()
            )

            if not condition:
                continue

            if "operator" in item:
                condition.operator = item["operator"]

            if "numeric_value" in item:
                condition.numeric_value = item["numeric_value"]

            if "string_value" in item:
                condition.string_value = item["string_value"]

            if "boolean_value" in item:
                condition.boolean_value = item["boolean_value"]

            if "list_name" in item:
                condition.list_name = item["list_name"]

            if "score" in item:
                condition.score = item["score"]

            if "trigger_description" in item:
                condition.trigger_description = item["trigger_description"]

            if "is_active" in item:
                condition.is_active = item["is_active"]

            touched_rules.add(condition.rule_id)

        # -----------------------------
        # Sync rule active state
        # -----------------------------
        for rule_id in touched_rules:

            rule = (
                db.query(RiskRule)
                .options(joinedload(RiskRule.conditions))
                .filter(RiskRule.id == rule_id)
                .first()
            )

            if not rule:
                continue

            has_active_condition = any(c.is_active for c in rule.conditions)

            rule.is_active = has_active_condition

        db.commit()

        return {"message": "Changes saved successfully"}

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))