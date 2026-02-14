from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc, func

from backend.database import get_db
from backend.models.bellNotifications import BellNotification  # adjust import path to your project

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

@router.get("/unread/{recipient_id}")
def get_unread_notifications(recipient_id: str, db: Session = Depends(get_db)):
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
def get_all_notifications(recipient_id: str, db: Session = Depends(get_db)):
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
def mark_one_read(application_id: str, db: Session = Depends(get_db)):
    db.query(BellNotification)\
      .filter(
          BellNotification.application_id == application_id,
          BellNotification.is_read == False
      )\
      .update({"is_read": True}, synchronize_session=False)
    
    db.commit()
    return {"message": "ok"}

@router.put("/read-all/{recipient_id}")
def mark_all_read(recipient_id: str, db: Session = Depends(get_db)):
    db.query(BellNotification)\
      .filter(
          BellNotification.recipient_id == recipient_id,
          BellNotification.is_read == False
      )\
      .update({"is_read": True}, synchronize_session=False)

    db.commit()
    return {"message": "ok"}