from enum import Enum
from datetime import datetime

class ApplicationStatus(str, Enum):
    UNDER_REVIEW = "Under Review"
    UNDER_MANUAL_REVIEW = "Under Manual Review"
    APPROVED = "Approved"
    REJECTED = "Rejected"
    REQUIRES_ACTION = "Requires Action"
    CANCELLED = "Cancelled"


class Application:
    def __init__(self, app_id, email, status):
        self.app_id = app_id
        self.email = email
        self.status = status
        self.created_at = datetime.utcnow()
        self.missing_docs_uploaded = False
