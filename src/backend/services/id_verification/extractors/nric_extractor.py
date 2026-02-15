import re
from typing import Dict, Optional
NRIC_RE = re.compile(r"\b[STFG]\s*\d{7}[A-Z]\b|\b[STFG]\s*\d{8}\b", re.I)

NOISE_LINES = {
    "REPUBLIC OF SINGAPORE",
    "IDENTITY CARD NO.",
    "MAJULAH SINGAPURA",
    "NRIC NO.",
    "NRIC NO",
}

def _clean_value_keep_newlines(text: str) -> str:
    if not text:
        return ""
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    text = re.sub(r"[ \t]+", " ", text)  # collapse spaces/tabs (not \n)
    return text.strip()

def _one_line(text: Optional[str]) -> str:
    if not text:
        return ""
    text = text.replace("\r\n", " ").replace("\n", " ").replace("\r", " ")
    text = re.sub(r"\s+", " ", text)
    return text.strip()

def _get_line_after_label(raw: str, label: str, lookahead: int = 6) -> str:
    lines = [l.strip() for l in raw.split("\n")]
    for i, line in enumerate(lines):
        if line.lower() == label.lower():
            for j in range(i + 1, min(i + lookahead, len(lines))):
                if lines[j].strip():
                    return lines[j].strip()
    return ""

def _extract_nric_any(raw: str) -> str:
    """
    Supports:
    - Old NRIC/FIN: S/T/F/G + 7 digits + letter (e.g. S1234567D)
    - OCR variant: S/T/F/G + 8 digits (e.g. S85201851)
    Prefer NRIC No line if present.
    """
    m = re.search(
        r"\bNRIC\s*No\.?\s*[: ]*\s*([STFG]\d{7}[A-Z]|[STFG]\d{8})\b",
        raw,
        flags=re.I,
    )
    if m:
        return m.group(1).upper()

    m2 = re.search(r"\b([STFG]\d{7}[A-Z]|[STFG]\d{8})\b", raw, flags=re.I)
    return m2.group(1).upper() if m2 else ""

def _extract_dob(raw: str) -> str:
    m = re.search(r"\b(\d{2}[-/]\d{2}[-/]\d{4})\b", raw)
    if m:
        return m.group(1)

    m2 = re.search(r"\b(\d{1,2}\s+[A-Z]{3}\s+\d{4})\b", raw, flags=re.I)
    return m2.group(1).upper() if m2 else ""

def _extract_sex(raw: str) -> str:
    s = _get_line_after_label(raw, "Sex").upper().strip()
    if s in ("M", "F"):
        return "MALE" if s == "M" else "FEMALE"
    if s in ("MALE", "FEMALE"):
        return s

    m = re.search(r"\bSex\b[^\n]*\b(M|F)\b", raw, flags=re.I)
    if m:
        return "MALE" if m.group(1).upper() == "M" else "FEMALE"

    return ""

def _clean_lines(raw: str) -> list[str]:
    # keep line boundaries but normalize spaces inside each line
    lines = []
    for l in raw.split("\n"):
        s = re.sub(r"\s+", " ", (l or "").strip())
        if s:
            lines.append(s)
    return lines

def _looks_chinese_only(s: str) -> bool:
    has_cjk = bool(re.search(r"[\u4e00-\u9fff]", s))
    has_latin = bool(re.search(r"[A-Za-z]", s))
    return has_cjk and not has_latin

def _extract_name(raw: str) -> str:
    """
    Robustly extract name from the block between "Name" and "Race" (or "Date of birth").
    This avoids the common OCR pattern where NRIC appears right after "Name".
    """
    lines = _clean_lines(raw)

    # find the "Name" label line
    name_idx = None
    for i, line in enumerate(lines):
        if line.lower() == "name":
            name_idx = i
            break
        # fallback: "Name <value>" on same line
        if line.lower().startswith("name "):
            # try to use remainder if it's not NRIC/noise
            candidate = line[5:].strip()
            if candidate and not NRIC_RE.fullmatch(candidate) and candidate.upper() not in NOISE_LINES:
                if not _looks_chinese_only(candidate):
                    return candidate
            name_idx = i
            break

    if name_idx is None:
        return ""

    # find end boundary: Race preferred; else Date of birth; else limited lookahead
    end_idx = None
    for j in range(name_idx + 1, min(name_idx + 12, len(lines))):
        lj = lines[j].lower()
        if lj == "race" or lj.startswith("race "):
            end_idx = j
            break
        if lj == "date of birth" or lj.startswith("date of birth "):
            end_idx = j
            break
    if end_idx is None:
        end_idx = min(name_idx + 8, len(lines))

    block = lines[name_idx + 1 : end_idx]

    candidates = []
    for s in block:
        su = s.upper().strip()

        if su in NOISE_LINES:
            continue

        # skip NRIC-looking lines
        if NRIC_RE.fullmatch(su) or NRIC_RE.search(su):
            continue

        # skip chinese-only line
        if _looks_chinese_only(s):
            continue

        # keep only sensible name characters
        cleaned = re.sub(r"[^A-Z '\-]", "", su).strip()
        cleaned = re.sub(r"\s+", " ", cleaned)

        if len(cleaned) < 3:
            continue

        # score: prefer multi-word longer names
        words = cleaned.split()
        score = sum(len(w) for w in words) + 5 * max(0, len(words) - 1)
        candidates.append((score, cleaned))

    if not candidates:
        return ""

    candidates.sort(reverse=True)
    return candidates[0][1]

def _extract_race(raw: str) -> str:
    return _get_line_after_label(raw, "Race")

def _extract_country_of_birth(raw: str) -> str:
    return _get_line_after_label(raw, "Country/Place of birth")

def _extract_address(raw: str) -> str:
    lines = [l.strip() for l in raw.split("\n")]
    collecting = False
    out = []
    seen_postal = False

    stop_labels = {
        "majulah singapura",
        "date of issue",
        "nric no.",
        "nric no",
        "sex",
        "country of birth",
        "country/place of birth",
        "date of birth",
        "race",
        "name",
        "identity card no.",
        "identity card no",
        "republic of singapore",
    }

    for line in lines:
        lower = line.lower()

        if not collecting:
            if lower == "address":
                collecting = True
            continue

        if not line:
            continue

        if lower in stop_labels:
            break

        if re.search(r"\b\d{6}\b", line):
            seen_postal = True

        if seen_postal and re.fullmatch(r"\d{6,10}", line):
            break

        out.append(line)

    return _one_line("\n".join(out))

def extract_nric_data(raw_text: str) -> Dict:
    raw = _clean_value_keep_newlines(raw_text)

    full_name = _extract_name(raw)
    nric = _extract_nric_any(raw)
    dob = _extract_dob(raw)
    sex = _extract_sex(raw)
    race = _extract_race(raw)
    place_of_birth = _extract_country_of_birth(raw)
    address = _extract_address(raw)

    return {
        "full_name": _one_line(full_name) or None,
        "nric": nric or None,
        "date_of_birth": _one_line(dob) or None,
        "sex": sex or None,
        "race": _one_line(race) or None,
        "country_or_place_of_birth": _one_line(place_of_birth) or None,
        "residential_address": address or None,
    }

