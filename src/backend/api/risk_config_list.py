from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.database import get_db
from backend.models.risk_config_list import RiskConfigList

router = APIRouter(prefix="/risk-config-list", tags=["risk-config-list"])


def to_dict(obj):
    return {c.name: getattr(obj, c.name) for c in obj.__table__.columns}


def normalize_item_label(value: str) -> str:
    if not value:
        return ""

    words = value.strip().split()
    normalized_words = []

    for word in words:
        # remove brackets for checking
        clean_word = word.strip("()")

        # if already uppercase acronym (e.g. IP, LLP, SG)
        if clean_word.isupper() and len(clean_word) <= 5:
            normalized_words.append(word.upper())
        else:
            normalized_words.append(word[:1].upper() + word[1:].lower())

    return " ".join(normalized_words)

@router.get("/")
def get_all_risk_config_list(db: Session = Depends(get_db)):
    rows = (
        db.query(RiskConfigList)
        .order_by(
            RiskConfigList.list_name.asc(),
            RiskConfigList.item_label.asc()
        )
        .all()
    )

    return [to_dict(r) for r in rows]


@router.get("/all-list-names")
def get_unique_list_names(db: Session = Depends(get_db)):
    rows = (
        db.query(RiskConfigList.list_name)
        .distinct()
        .order_by(RiskConfigList.list_name.asc())
        .all()
    )

    return [r[0] for r in rows]


@router.get("/list-names")
def get_list_names(db: Session = Depends(get_db)):
    excluded_list_names = {"THRESHOLDS"}

    rows = (
        db.query(RiskConfigList.list_name)
        .distinct()
        .order_by(RiskConfigList.list_name.asc())
        .all()
    )

    return [
        row[0]
        for row in rows
        if row[0] not in excluded_list_names
    ]


@router.get("/byListName/{list_name}")
def get_risk_config_by_list_name(list_name: str, db: Session = Depends(get_db)):
    rows = (
        db.query(RiskConfigList)
        .filter(RiskConfigList.list_name == list_name)
        .order_by(RiskConfigList.item_label.asc())
        .all()
    )

    if not rows:
        raise HTTPException(status_code=404, detail="No config items found for this list_name")

    return [to_dict(r) for r in rows]


@router.get("/active/byListName/{list_name}")
def get_active_risk_config_by_list_name(list_name: str, db: Session = Depends(get_db)):
    rows = (
        db.query(RiskConfigList)
        .filter(
            RiskConfigList.list_name == list_name,
            RiskConfigList.is_active == True
        )
        .order_by(RiskConfigList.item_label.asc())
        .all()
    )

    if not rows:
        raise HTTPException(status_code=404, detail="No active config items found for this list_name")

    return [to_dict(r) for r in rows]


@router.get("/byId/{id}")
def get_risk_config_item_by_id(id: int, db: Session = Depends(get_db)):
    row = db.query(RiskConfigList).filter(RiskConfigList.id == id).first()

    if not row:
        raise HTTPException(status_code=404, detail="Risk config item not found")

    return to_dict(row)


def build_duplicate_query(db, *, current_id=None, list_name="", item_label=""):
    query = db.query(RiskConfigList).filter(
        func.lower(RiskConfigList.list_name) == list_name.lower(),
        func.lower(RiskConfigList.item_label) == item_label.lower(),
    )

    if current_id is not None:
        query = query.filter(RiskConfigList.id != current_id)

    return query


@router.put("/save-changes")
def save_risk_config_list_changes(data: dict = Body(...), db: Session = Depends(get_db)):
    updates = data.get("updates") or []
    creates = data.get("creates") or []

    updated_items = []
    created_items = []

    try:
        # -------------------------
        # Handle updates
        # -------------------------
        for upd in updates:
            row_id = upd.get("id")
            if not row_id:
                raise HTTPException(status_code=400, detail="Update item missing id")

            row = db.query(RiskConfigList).filter(RiskConfigList.id == row_id).first()
            if not row:
                raise HTTPException(status_code=404, detail=f"Risk config item {row_id} not found")

            if "list_name" in upd and upd["list_name"] is not None:
                row.list_name = upd["list_name"].strip()

            if "item_label" in upd and upd["item_label"] is not None:
                row.item_label = normalize_item_label(upd["item_label"])

            if "item_type" in upd and upd["item_type"] is not None:
                row.item_type = upd["item_type"].strip()

            if "is_active" in upd:
                row.is_active = upd["is_active"]

            normalized_type = (row.item_type or "").strip().lower()

            if normalized_type == "threshold":
                incoming_item_value = upd.get("item_value")
                item_value = (incoming_item_value or "").strip()

                if not item_value:
                    raise HTTPException(
                        status_code=400,
                        detail="item_value is required for threshold updates"
                    )

                row.item_value = item_value
            else:
                row.item_value = None

            if not row.list_name:
                raise HTTPException(status_code=400, detail="list_name is required for update")

            if not row.item_label:
                raise HTTPException(status_code=400, detail="item_label is required for update")

            if not row.item_type:
                raise HTTPException(status_code=400, detail="item_type is required for update")

            duplicate = build_duplicate_query(
                db,
                current_id=row.id,
                list_name=row.list_name,
                item_label=row.item_label,
            ).first()

            if duplicate:
                raise HTTPException(
                    status_code=400,
                    detail=f"Duplicate found for update: {row.list_name} / {row.item_label}"
                )

            updated_items.append(row)

        # -------------------------
        # Handle creates
        # -------------------------
        for item in creates:
            list_name = (item.get("list_name") or "").strip()
            item_label = normalize_item_label(item.get("item_label") or "")
            item_type = (item.get("item_type") or "").strip()
            is_active = item.get("is_active", True)

            normalized_type = item_type.lower()

            if normalized_type == "threshold":
                item_value = (item.get("item_value") or "").strip()
            else:
                item_value = None

            if not list_name:
                raise HTTPException(status_code=400, detail="list_name is required for create")
            if not item_label:
                raise HTTPException(status_code=400, detail="item_label is required for create")
            if not item_type:
                raise HTTPException(status_code=400, detail="item_type is required for create")

            if normalized_type == "threshold" and not item_value:
                raise HTTPException(status_code=400, detail="item_value is required for threshold create")

            existing = build_duplicate_query(
                db,
                list_name=list_name,
                item_label=item_label,
            ).first()

            if existing:
                raise HTTPException(
                    status_code=400,
                    detail=f"Duplicate found for create: {list_name} / {item_label}"
                )

            new_item = RiskConfigList(
                list_name=list_name,
                item_value=item_value,
                item_label=item_label,
                item_type=item_type,
                is_active=is_active
            )

            db.add(new_item)
            created_items.append(new_item)

        db.commit()

        for row in updated_items:
            db.refresh(row)

        for row in created_items:
            db.refresh(row)

        return {
            "message": "Changes saved successfully",
            "updated_items": [to_dict(r) for r in updated_items],
            "created_items": [to_dict(r) for r in created_items]
        }

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    

def parse_threshold_value(value):
    try:
        num = float(value)
        return int(num) if num.is_integer() else num
    except (TypeError, ValueError):
        return value
    

@router.get("/threshold/{item_label}")
def get_threshold_by_label(item_label: str, db: Session = Depends(get_db)):
    row = (
        db.query(RiskConfigList)
        .filter(
            func.lower(RiskConfigList.item_type) == "threshold",
            func.lower(RiskConfigList.item_label) == item_label.lower(),
            RiskConfigList.is_active == True
        )
        .first()
    )

    if not row:
        raise HTTPException(
            status_code=404,
            detail=f"Active threshold '{item_label}' not found"
        )

    return {
        "item_value": parse_threshold_value(row.item_value),
    }