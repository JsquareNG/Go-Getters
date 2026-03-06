# extractors/ktp_extractor.py
import re
from typing import Optional, Dict, List


# -----------------------------
# Text helpers
# -----------------------------
def _norm_spaces(s: str) -> str:
    """Flatten text to a single line with normalized spaces."""
    return re.sub(r"\s+", " ", (s or "").replace("\r", " ").replace("\n", " ")).strip()


def _clean_name(s: str) -> str:
    """Keep only name-ish characters and normalize."""
    s = (s or "").upper()
    s = re.sub(r"[^A-Z '\-]", " ", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s


def _stop_key(s: str) -> str:
    """Uppercase letters only, removing spaces/punct (for robust label matching)."""
    return re.sub(r"[^A-Z]", "", (s or "").upper())


def _lines(raw_text: str) -> List[str]:
    """Clean, keep line boundaries."""
    lines = [re.sub(r"\s+", " ", (l or "").strip()) for l in (raw_text or "").split("\n")]
    return [l for l in lines if l]


# -----------------------------
# Label sets
# -----------------------------
STOP_LABELS = {
    "TEMPAT/TGL LAHIR",
    "TEMPAT/TG LAHIR",
    "JENIS KELAMIN",
    "GOL DARAH",
    "ALAMAT",
    "AGAMA",
    "STATUS PERKAWINAN",
    "PEKERJAAN",
    "KEWARGANEGARAAN",
    "BERLAKU HINGGA",
}

STOP_KEYS = {_stop_key(x) for x in STOP_LABELS} | {
    # common OCR variants
    "TEMPATTGLLAHIR",
    "TEMPATTGLAHIR",
    "JENISKELAMIN",
    "GOLDARAH",
    "STATUSPERKAWINAN",
    "KEWARGANEGARAAN",
    "BERLAKUHINGGA",
}

HEADER_PREFIXES = ("PROVINSI", "KABUPATEN", "KOTA")

RELIGION_WORDS = {
    "ISLAM",
    "KRISTEN",
    "KATOLIK",
    "HINDU",
    "BUDDHA",
    "BUDHA",
    "KONGHUCU",
    "KHONGHUCU",
}


def _is_stop_label(u: str) -> bool:
    uk = _stop_key(u)
    return any(uk.startswith(k) for k in STOP_KEYS)


def _is_header_line(u: str) -> bool:
    uk = _stop_key(u.replace("/", ""))
    return uk.startswith(HEADER_PREFIXES)


# -----------------------------
# Heuristics
# -----------------------------
def _looks_like_gender(v: str) -> bool:
    vu = (v or "").upper().replace(" ", "").replace("-", "")
    return vu in ("LAKILAKI", "PEREMPUAN")


def _looks_like_rtrw(v: str) -> bool:
    return bool(re.fullmatch(r"\d{1,3}\s*/\s*\d{1,3}", (v or "").strip()))


def _looks_like_address(v: str) -> bool:
    s = (v or "").strip()
    if not s:
        return False
    if _looks_like_rtrw(s) or _looks_like_gender(s):
        return False
    # address-like: contains letters and is not too short
    return bool(re.search(r"[A-Za-z]", s)) and len(s) >= 6


# -----------------------------
# Stream KV parser (robust)
# -----------------------------
def _assign_kv(out: Dict[str, Optional[str]], key: str, value: str) -> None:
    v = _norm_spaces(value)
    if not v:
        return

    if key == "GENDER":
        if out.get("gender_raw") is None:
            out["gender_raw"] = v
        return

    if key == "CITIZENSHIP":
        if out.get("citizenship_raw") is None:
            m = re.search(r"\b(WNI|WNA)\b", v, flags=re.I)
            out["citizenship_raw"] = (m.group(1).upper() if m else v)
        return

    if key == "AGAMA":
        # store (or ignore). storing prevents ':' values from contaminating others.
        if out.get("agama") is None:
            out["agama"] = v
        return

    if key == "RTRW":
        if _looks_like_gender(v) and out.get("gender_raw") is None:
            out["gender_raw"] = v
            return
        if out.get("rt_rw") is None and _looks_like_rtrw(v):
            out["rt_rw"] = v
        return
    

    if key == "KELDESA":
        if out.get("kel_desa") is None and not _looks_like_gender(v) and not _looks_like_rtrw(v):
            out["kel_desa"] = v
        return

    if key == "KECAMATAN":
        if out.get("kecamatan") is None and not _looks_like_gender(v) and not _looks_like_rtrw(v):
            out["kecamatan"] = v
        return

    if key == "ALAMAT":
        if out.get("alamat") is None and _looks_like_address(v):
            out["alamat"] = v
        return

    if key == "GOLDARAH":
        if out.get("alamat") is None and _looks_like_address(v):
            out["alamat"] = v
            return
        if out.get("rt_rw") is None and _looks_like_rtrw(v):
            out["rt_rw"] = v
        return


def _parse_kv_stream(raw_text: str) -> Dict[str, Optional[str]]:
    lines = _lines(raw_text)

    def label_key(line: str) -> Optional[str]:
        u = (line or "").upper().strip()
        uk = _stop_key(u)

        # Address block labels
        if uk == "ALAMAT" or u.startswith("ALAMAT"):
            return "ALAMAT"
        if uk == "RTRW" or u.startswith("RT/RW"):
            return "RTRW"
        # Kel/Desa variants (KelDesa, KellDesa, Kel/Desa)
        if uk in ("KELDESA", "KELLDESA") or u.startswith("KEL/DESA") or u.startswith("KELDESA") or u.startswith("KELLDESA"):
            return "KELDESA"
        if uk == "KECAMATAN" or u.startswith("KECAMATAN"):
            return "KECAMATAN"

        # Other labels (for rescue / correctness)
        if uk == "AGAMA" or u.startswith("AGAMA"):
            return "AGAMA"
        if uk == "JENISKELAMIN" or u.startswith("JENIS KELAMIN"):
            return "GENDER"
        if (u.startswith("GOL") and "DARAH" in u) or ("GOLDARAH" in uk):
            return "GOLDARAH"
        if uk == "KEWARGANEGARAAN" or u.startswith("KEWARGANEGARAAN"):
            return "CITIZENSHIP"

        return None

    out: Dict[str, Optional[str]] = {
        "alamat": None,
        "rt_rw": None,
        "kel_desa": None,
        "kecamatan": None,
        "gender_raw": None,
        "citizenship_raw": None,
        # optional (not required, but helps prevent contamination)
        "agama": None,
    }

    current: Optional[str] = None

    for line in lines:
        l = line.strip()
        u = l.upper()

        # Detect label and set current
        lk = label_key(l)
        if lk:
            current = lk
            if not re.search(r"[:\-]\s*\S", l):
                continue

        # Inline: "Label : value" or "Label -: value" or "Kecamatan : NGADILUWIH"
        m_inline = re.match(r"^([A-Za-z/.\s]+?)\s*[:\-]\s*(.+)$", l)
        if m_inline:
            maybe_label = m_inline.group(1).strip()
            value = m_inline.group(2).strip()
            lk2 = label_key(maybe_label)
            if lk2:
                current = lk2
                _assign_kv(out, current, value)
                continue

        # Value line: ": SOMETHING"
        if l.startswith(":"):
            value = l[1:].strip()

            assigned = False
            if current:
                before = dict(out)
                _assign_kv(out, current, value)
                assigned = (out != before)

            # Orphan ":" rescue (when OCR shifts labels)
            if not assigned:
                v = _norm_spaces(value)

                # 1) RT/RW pattern
                if out.get("rt_rw") is None and _looks_like_rtrw(v):
                    out["rt_rw"] = v
                    continue

                # 2) Gender pattern (sometimes lands here)
                if out.get("gender_raw") is None and _looks_like_gender(v):
                    out["gender_raw"] = v
                    continue

                # 3) Address-like text
                if out.get("alamat") is None and _looks_like_address(v):
                    out["alamat"] = v
                    continue

                # 4) Kel/Desa guess:
                # If it's not address, not rtrw, not gender, and we already have alamat or rt_rw,
                # then this is likely a locality name (Kel/Desa).
                vu = v.upper().strip()

                if (
                    out.get("kel_desa") is None
                    and vu not in RELIGION_WORDS
                    and not _looks_like_address(v)
                    and not _looks_like_rtrw(v)
                    and not _looks_like_gender(v)
                    and (out.get("alamat") is not None or out.get("rt_rw") is not None)
                    and re.search(r"[A-Za-z]", v)
                    and len(v) >= 3
                ):
                    out["kel_desa"] = v
                    continue

            continue

        if current in ("ALAMAT", "KELDESA", "KECAMATAN", "RTRW", "GENDER", "CITIZENSHIP", "AGAMA"):
            # ignore if this line is actually another label / stop label / header
            if label_key(l) is None and not _is_stop_label(u) and not _is_header_line(u):
                _assign_kv(out, current, l)
                continue

    return out


# -----------------------------
# Name extraction (line-based)
# -----------------------------
def _extract_ktp_name_from_lines(raw_text: str) -> Optional[str]:
    lines = _lines(raw_text)

    # Locate the "Nama" label
    try:
        start = next(i for i, l in enumerate(lines) if l.strip().lower() == "nama")
    except StopIteration:
        return None

    colon_candidates: List[str] = []
    other_candidates: List[str] = []

    i = start + 1
    while i < len(lines):
        l = lines[i].strip()
        u = l.upper()

        if _is_stop_label(u):
            break

        if _is_header_line(u):
            i += 1
            continue

        # skip NIK line sometimes appearing here
        if re.fullmatch(r"\d{16}", u):
            i += 1
            continue

        if u in ("NIK:", "NIK", "NIK :"):
            i += 1
            continue

        # name often appears after ":" (either ":" then next line, or ": NAME")
        if u == ":" and i + 1 < len(lines):
            nxt = _clean_name(lines[i + 1])
            if nxt and len(nxt) >= 3:
                colon_candidates.append(nxt)
            i += 2
            continue

        if u.startswith(":"):
            val = _clean_name(l.split(":", 1)[1])
            if val and len(val) >= 3:
                colon_candidates.append(val)
            i += 1
            continue

        cleaned = _clean_name(l)
        if cleaned and len(cleaned) >= 3:
            other_candidates.append(cleaned)

        i += 1

    if colon_candidates:
        return colon_candidates[-1]
    if other_candidates:
        return other_candidates[-1]
    return None


# -----------------------------
# Main extractor
# -----------------------------
def extract_ktp_from_text(raw_text: str) -> Dict:
    """
    Extract key fields from Indonesian KTP OCR text.
    Outputs English-normalized gender & citizenship.
    """
    text = _norm_spaces(raw_text)

    # Parse stream once (used for address + fallback gender/citizenship)
    kv = _parse_kv_stream(raw_text)

    # ---- NIK ----
    m_nik = re.search(r"\bNIK\b\s*[:\-]?\s*(\d{16})\b", text, flags=re.I)
    if m_nik:
        nik = m_nik.group(1)
    else:
        m16 = re.search(r"\b\d{16}\b", text)
        nik = m16.group(0) if m16 else None

    # ---- Full Name ----
    full_name = _extract_ktp_name_from_lines(raw_text)
    if not full_name:
        # fallback for one-line OCR formats: after NIK until birth/gender label
        m = re.search(
            r"\b(\d{16})\b\s*[:\-]?\s*(.+?)(?=\s+\bTempat/Tg(?:l)?\s*Lahir\b|\s+\bJenis\s*Kelamin\b|$)",
            text,
            flags=re.I,
        )
        if m:
            chunk = m.group(2).strip()
            if ":" in chunk:
                chunk = chunk.split(":")[-1].strip()
            full_name = _clean_name(chunk) or None
    else:
        full_name = _clean_name(full_name) or None

    # ---- Birth place + DOB ----
    m_birth = re.search(
        r"\bTempat/Tg(?:l)?\s*Lahir\b\s*[:\-]?\s*([^,]+?)\s*,\s*(\d{2}-\d{2}-\d{4})\b",
        text,
        flags=re.I,
    )
    place_of_birth = _norm_spaces(m_birth.group(1)) if m_birth else None
    if m_birth:
        dob = m_birth.group(2)
    else:
        m_dob = re.search(r"\b\d{2}-\d{2}-\d{4}\b", text)
        dob = m_dob.group(0) if m_dob else None

    # ---- Gender (map to EN) ----
    m_gender = re.search(r"\bJenis\s*Kelamin\b.*?\b(LAKI[- ]?LAKI|PEREMPUAN)\b", text, flags=re.I)
    raw_g = (m_gender.group(1) if m_gender else None) or (kv.get("gender_raw") or "")
    g = raw_g.upper().replace(" ", "").replace("-", "")
    gender = "MALE" if g == "LAKILAKI" else "FEMALE" if g == "PEREMPUAN" else None

    # ---- Citizenship (map to EN) ----
    m_nat = (
        re.search(r"\bKewarganegaraan\b\s*[:\-]?\s*\b(WNI|WNA)\b", text, flags=re.I)
        or re.search(r"\b(WNI|WNA)\b", text, flags=re.I)
    )
    raw_c = (m_nat.group(1) if m_nat else None) or (kv.get("citizenship_raw") or "")
    c = raw_c.upper()
    nationality = "INDONESIAN CITIZEN" if c == "WNI" else "FOREIGN NATIONAL" if c == "WNA" else None

    # ---- Address ----
    parts: List[str] = []
    if kv.get("alamat"):
        parts.append(kv["alamat"])
    if kv.get("rt_rw"):
        parts.append(f"RT/RW {kv['rt_rw']}")
    if kv.get("kel_desa"):
        parts.append(f"Kel/Desa {kv['kel_desa']}")
    if kv.get("kecamatan"):
        parts.append(f"Kecamatan {kv['kecamatan']}")

    address = ", ".join(parts) if parts else None

    return {
        "full_name": full_name,
        "nik": nik,
        "place_of_birth": place_of_birth,
        "date_of_birth": dob,
        "gender": gender,
        "nationality": nationality,
        "address": address,
    }