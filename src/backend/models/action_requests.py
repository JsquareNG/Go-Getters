import uuid
from sqlalchemy import Column, String, ForeignKey, DateTime, Boolean, text, CheckConstraint
from sqlalchemy.orm import relationship
from backend.database import Base


class ActionRequest(Base):
    __tablename__ = "action_requests"

    action_request_id = Column(
        String(36),
        primary_key=True,
        nullable=False,
        default=lambda: str(uuid.uuid4()),
        unique=True,
    )

    application_id = Column(
        String(8),
        ForeignKey("application_form.application_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    reviewer_id = Column(String(8), nullable=False, index=True)
    reason = Column(String(500), nullable=False)

    status = Column(String(20), nullable=False, server_default=text("'OPEN'"))

    created_at = Column(
        DateTime(timezone=False),
        nullable=False,
        server_default=text("(now() AT TIME ZONE 'Asia/Singapore')"),
    )

    application = relationship("ApplicationForm", back_populates="action_requests")
    
    items = relationship(
        "ActionRequestItem",
        back_populates="action_request",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    __table_args__ = (
        CheckConstraint(
            "status IN ('OPEN','SUBMITTED','CLOSED')",
            name="chk_action_requests_status",
        ),
    )


class ActionRequestItem(Base):
    __tablename__ = "action_request_items"

    item_id = Column(
        String(36),
        primary_key=True,
        nullable=False,
        default=lambda: str(uuid.uuid4()),
        unique=True,
    )

    action_request_id = Column(
        String(36),
        ForeignKey("action_requests.action_request_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # DOCUMENT or QUESTION
    item_type = Column(String(20), nullable=False)

    # DOCUMENT (free-text request)
    document_name = Column(String(500), nullable=True)
    document_desc = Column(String(500), nullable=True)

    # QUESTION
    question_text = Column(String(500), nullable=True)
    answer_text = Column(String(1500), nullable=True)

    fulfilled = Column(Boolean, nullable=False, server_default=text("false"))
    fulfilled_at = Column(DateTime(timezone=False), nullable=True)

    action_request = relationship("ActionRequest", back_populates="items")

    __table_args__ = (
        CheckConstraint(
            "item_type IN ('DOCUMENT','QUESTION')",
            name="chk_action_request_items_type",
        ),
        CheckConstraint(
            "(item_type <> 'DOCUMENT') OR (document_name IS NOT NULL AND length(trim(document_name)) > 0)",
            name="chk_action_request_items_document_name_required",
        ),
        CheckConstraint(
            "(item_type <> 'QUESTION') OR (question_text IS NOT NULL AND length(trim(question_text)) > 0)",
            name="chk_action_request_items_question_text_required",
        ),
    )