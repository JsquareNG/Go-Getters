import re
from typing import Dict

def _clean(text: str) -> str:
    if not text:
        return ""
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    text = re.sub(r"\s+", " ", text)
    return text.strip()

def extract_ktp_from_text(raw_text: str) -> Dict:
    text = _clean(raw_text)

    # -------- NIK (16 digits) --------
    nik_match = re.search(r"\b\d{16}\b", text)
    nik = nik_match.group(0) if nik_match else None

    # -------- Name --------
    name_match = re.search(r"Nama\s*[:\-]?\s*(.+)", text, flags=re.I)
    full_name = name_match.group(1).strip() if name_match else None

    # -------- DOB --------
    dob_match = re.search(r"\b\d{2}-\d{2}-\d{4}\b", text)
    dob = dob_match.group(0) if dob_match else None

    # -------- Gender --------
    gender_match = re.search(r"(LAKI[- ]?LAKI|PEREMPUAN)", text, flags=re.I)
    gender = gender_match.group(1).upper() if gender_match else None

    # -------- Address --------
    address_match = re.search(r"Alamat\s*[:\-]?\s*(.+)", text, flags=re.I)
    address = address_match.group(1).strip() if address_match else None

    # -------- Nationality --------
    nationality_match = re.search(r"\b(WNI|WNA)\b", text)
    nationality = nationality_match.group(1) if nationality_match else None

    return {
        "full_name": full_name,
        "nik": nik,
        "date_of_birth": dob,
        "gender": gender,
        "nationality": nationality,
        "address": address,
    }