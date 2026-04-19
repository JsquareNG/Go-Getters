from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc, func

from backend.auth.dependencies import get_current_user
from backend.database import get_db
from backend.models.bellNotifications import BellNotification

router = APIRouter(prefix="/bell", tags=["Bell Notifications"])

def _notif_to_dict(n: BellNotification):
    return {
        "notification_id": str(n.id),
        "application_id": n.application_id,
        "recipient_id": n.recipient_id,
        "from_status": n.from_status,
        "to_status": n.to_status,
        "message": n.message,
        "is_read": n.is_read,
        "created_at": n.created_at,
    }

def _current_user_id(current_user: dict) -> str:
    user_id = current_user.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")
    return user_id


def _ensure_same_recipient(recipient_id: str, current_user: dict):
    current_user_id = _current_user_id(current_user)
    if recipient_id != current_user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden",
        )


@router.get("/unread/{recipient_id}")
def get_unread_notifications(
    recipient_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    _ensure_same_recipient(recipient_id, current_user)

    rows = (
        db.query(BellNotification)
        .filter(
            BellNotification.recipient_id == recipient_id,
            BellNotification.is_read == False,
        )
        .order_by(desc(BellNotification.created_at))
        .limit(50)
        .all()
    )

    return {
        "total": len(rows),
        "notifications": [_notif_to_dict(n) for n in rows],
    }


@router.get("/all/{recipient_id}")
def get_all_notifications(
    recipient_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    _ensure_same_recipient(recipient_id, current_user)

    base_query = (
        db.query(BellNotification)
        .filter(BellNotification.recipient_id == recipient_id)
    )

    rows = (
        base_query
        .order_by(desc(BellNotification.created_at))
        .limit(10)
        .all()
    )

    unread_count = (
        db.query(func.count(BellNotification.id))
        .filter(
            BellNotification.recipient_id == recipient_id,
            BellNotification.is_read == False
        )
        .scalar()
    )

    return {
        "total": len(rows),
        "unread": unread_count,
        "notifications": [_notif_to_dict(n) for n in rows],
    }


@router.put("/read-one/{application_id}")
def mark_one_read(
    application_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    current_user_id = _current_user_id(current_user)

    updated = (
        db.query(BellNotification)
        .filter(
            BellNotification.application_id == application_id,
            BellNotification.recipient_id == current_user_id,
            BellNotification.is_read == False,
        )
        .update({"is_read": True}, synchronize_session=False)
    )

    db.commit()

    if updated == 0:
        raise HTTPException(status_code=404, detail="Notification not found")

    return {"message": "ok"}


@router.put("/read-all/{recipient_id}")
def mark_all_read(
    recipient_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    _ensure_same_recipient(recipient_id, current_user)

    db.query(BellNotification)\
      .filter(
          BellNotification.recipient_id == recipient_id,
          BellNotification.is_read == False
      )\
      .update({"is_read": True}, synchronize_session=False)

    db.commit()
    return {"message": "ok"}