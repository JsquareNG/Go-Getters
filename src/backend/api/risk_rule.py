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


@router.get("/")
def get_all_risk_rules(db: Session = Depends(get_db)):
    rows = (
        db.query(RiskRule)
        .options(joinedload(RiskRule.conditions))
        .order_by(RiskRule.category.asc(), RiskRule.rule_code.asc())
        .all()
    )

    rules = [rule_to_dict(r) for r in rows]

    categories_map = {}

    for rule in rules:
        category = (rule.get("category") or "UNCATEGORIZED").upper()

        if category not in categories_map:
            categories_map[category] = {
                "category": category,
                "total_rules": 0,
                "active_rules": 0,
                "inactive_rules": 0,
                "rules": [],
            }

        categories_map[category]["total_rules"] += 1

        if rule.get("is_active"):
            categories_map[category]["active_rules"] += 1
        else:
            categories_map[category]["inactive_rules"] += 1

        categories_map[category]["rules"].append({
            "rule_id": rule["rule_id"],
            "rule_code": rule["rule_code"],
            "rule_name": rule["rule_name"],
            "description": rule["description"],
            "is_active": rule["is_active"],
            "updated_at": rule["updated_at"],
        })

    categories = sorted(categories_map.values(), key=lambda x: x["category"])

    return {
        "total_rules": len(rules),
        "total_categories": len(categories),
        "category_types": [c["category"] for c in categories],
        "categories": categories,
        "rules": rules,
    }


@router.get("/categories")
def get_basic_compliance_categories(db: Session = Depends(get_db)):
    try:
        excluded_categories = ["KYC", "KYB"]

        categories = (
            db.query(RiskRule.category)
            .filter(~RiskRule.category.in_(excluded_categories))
            .distinct()
            .order_by(RiskRule.category.asc())
            .all()
        )

        unique_categories = [
            row[0] for row in categories
            if row[0] is not None and str(row[0]).strip() != ""
        ]

        return {
            "categories": unique_categories
        }

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


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
        rule_creates = payload.get("creates", [])
        new_conditions = payload.get("new_conditions", [])

        touched_rules = set()

        for item in rule_creates:
            new_rule = RiskRule(
                rule_code=item["rule_code"].strip(),
                rule_name=item["rule_name"].strip(),
                category=item["category"],
                description=(item.get("description") or "").strip(),
                is_active=bool(item.get("is_active", True)),
            )

            db.add(new_rule)
            db.flush()

            created_conditions = item.get("conditions", [])
            if not created_conditions:
                raise HTTPException(
                    status_code=400,
                    detail=f"Rule '{new_rule.rule_code}' must have at least one condition."
                )

            for cond in created_conditions:
                new_condition = RiskRuleCondition(
                    rule_id=new_rule.id,
                    condition_group=cond["condition_group"],
                    order_no=cond["order_no"],
                    field_name=cond.get("field_name"),
                    operator=cond["operator"],
                    value_type=cond["value_type"],
                    numeric_value=cond.get("numeric_value"),
                    string_value=cond.get("string_value"),
                    boolean_value=cond.get("boolean_value"),
                    list_name=cond.get("list_name"),
                    score=cond["score"],
                    trigger_description=(cond.get("trigger_description") or "").strip(),
                    is_active=bool(cond.get("is_active", True)),
                )
                db.add(new_condition)

            touched_rules.add(new_rule.id)

        for item in rule_updates:
            rule = db.query(RiskRule).options(joinedload(RiskRule.conditions)).filter(
                RiskRule.id == item["rule_id"]
            ).first()

            if not rule:
                continue

            if "rule_code" in item:
                rule.rule_code = item["rule_code"].strip()

            if "rule_name" in item:
                rule.rule_name = item["rule_name"].strip()

            if "description" in item:
                rule.description = (item["description"] or "").strip()

            if "is_active" in item:
                rule.is_active = bool(item["is_active"])

                if rule.is_active is False:
                    for c in rule.conditions:
                        c.is_active = False
                elif rule.is_active is True:
                    all_inactive = all(not c.is_active for c in rule.conditions)
                    if all_inactive:
                        for c in rule.conditions:
                            c.is_active = True

            touched_rules.add(rule.id)

        for item in new_conditions:
            rule = db.query(RiskRule).options(joinedload(RiskRule.conditions)).filter(
                RiskRule.id == item["rule_id"]
            ).first()

            if not rule:
                continue

            new_condition = RiskRuleCondition(
                rule_id=rule.id,
                condition_group=item["condition_group"],
                order_no=item["order_no"],
                field_name=item.get("field_name"),
                operator=item["operator"],
                value_type=item["value_type"],
                numeric_value=item.get("numeric_value"),
                string_value=item.get("string_value"),
                boolean_value=item.get("boolean_value"),
                list_name=item.get("list_name"),
                score=item["score"],
                trigger_description=(item.get("trigger_description") or "").strip(),
                is_active=bool(item.get("is_active", True)),
            )

            db.add(new_condition)
            touched_rules.add(rule.id)

        for item in condition_updates:
            condition = (
                db.query(RiskRuleCondition)
                .filter(RiskRuleCondition.id == item["condition_id"])
                .first()
            )

            if not condition:
                continue

            if "condition_group" in item:
                condition.condition_group = item["condition_group"]

            if "order_no" in item:
                condition.order_no = item["order_no"]

            if "field_name" in item:
                condition.field_name = item["field_name"]

            if "operator" in item:
                condition.operator = item["operator"]

            if "value_type" in item:
                condition.value_type = item["value_type"]

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
                condition.trigger_description = (item["trigger_description"] or "").strip()

            if "is_active" in item:
                condition.is_active = bool(item["is_active"])

            touched_rules.add(condition.rule_id)

        db.flush()

        for rule_id in touched_rules:
            rule = (
                db.query(RiskRule)
                .options(joinedload(RiskRule.conditions))
                .filter(RiskRule.id == rule_id)
                .first()
            )

            if not rule:
                continue

            if not rule.conditions:
                raise HTTPException(
                    status_code=400,
                    detail=f"Rule ID {rule_id} must have at least one condition."
                )

            has_active_condition = any(c.is_active for c in rule.conditions)
            rule.is_active = has_active_condition

        db.commit()

        return {"message": "Changes saved successfully"}

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))