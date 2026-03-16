from collections import defaultdict
from sqlalchemy.orm import Session
from backend.models.risk_config_list import RiskConfigList

def parse_threshold(value):
    try:
        num = float(value)
        return int(num) if num.is_integer() else num
    except (TypeError, ValueError):
        return value


def load_active_risk_config(db: Session):
    rows = (
        db.query(RiskConfigList)
        .filter(RiskConfigList.is_active == True)
        .order_by(
            RiskConfigList.list_name.asc(),
            RiskConfigList.item_label.asc()
        )
        .all()
    )

    config_lists = defaultdict(set)
    thresholds = {}

    for row in rows:
        item_type = (row.item_type or "").lower()

        if item_type == "threshold": 
            thresholds[row.item_label] = parse_threshold(row.item_value)
        else:
            config_lists[row.list_name].add(row.item_label)

    return {
        "lists": dict(config_lists),
        "thresholds": thresholds,
    }


def get_config_set(config: dict, list_name: str) -> set:
    return config.get("lists", {}).get(list_name, set())


def get_threshold(config: dict, key: str, default=None):
    return config.get("thresholds", {}).get(key, default)