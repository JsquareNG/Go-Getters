import re
from ..constants import DocType

def detect_doc_type(clean_text: str) -> DocType:
    t = (clean_text or "").upper()

    # SG NRIC cues
    nric_keywords = ["REPUBLIC OF SINGAPORE", "NRIC", "MAJULAH SINGAPURA", "IDENTITY CARD"]
    if any(k in t for k in nric_keywords):
        return DocType.SG_NRIC

    # ID KTP cues
    ktp_keywords = ["KARTU TANDA PENDUDUK", "PROVINSI", "KABUPATEN", "KOTA", "KECAMATAN", "KEL/DESA", "NIK"]
    if any(k in t for k in ktp_keywords):
        return DocType.ID_KTP

    # Structure fallback
    if re.search(r"\b\d{16}\b", t) and "NIK" in t:
        return DocType.ID_KTP

    if re.search(r"\b[STFG]\d{7}[A-Z]\b", t):
        return DocType.SG_NRIC

    return DocType.UNKNOWN