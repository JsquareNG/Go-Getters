from enum import Enum

class DocType(str, Enum):
    SG_NRIC = "SG_NRIC"
    ID_KTP = "ID_KTP"
    UNKNOWN = "UNKNOWN"

class Route(str, Enum):
    AUTO_PASS = "AUTO_PASS"
    NEEDS_ACTION = "NEEDS_ACTION"
    MANUAL_REVIEW = "MANUAL_REVIEW"