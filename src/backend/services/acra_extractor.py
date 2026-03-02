# services/acra_extractor.py

import re
from typing import Dict, List, Any, Optional


# --------------------------------------------------
# 1. Helpers
# --------------------------------------------------

def _normalize_key(text: str) -> str:
    text = (text or "").lower().strip()
    text = re.sub(r"[^a-z0-9 ]+", "", text)
    return text


def _norm(text: str) -> str:
    return re.sub(r"\s+", " ", (text or "").strip().upper())

def _parse_int(s: str) -> Optional[int]:
    if not s:
        return None
    s = re.sub(r"[^\d]", "", s)
    return int(s) if s else None


def kv_get_fuzzy(kv: Dict[str, str], *aliases: str) -> str:
    """
    Exact match first.
    Then contains-match for smashed keys like 'date ofappointment'
    """
    keys = list(kv.keys())

    for alias in aliases:
        na = _normalize_key(alias)

        # exact match
        if na in kv and kv[na]:
            return kv[na]

        # contains match
        for k in keys:
            if na and na in k and kv.get(k):
                return kv[k]

    return ""


def text_get_activity(full_text: str, which: str) -> str:
    """
    Extract "Primary Activity" or "Secondary Activity" from raw document text.
    Works when DocumentAI doesn't put them into form_fields.
    """
    if not full_text:
        return ""

    pat = re.compile(rf"{which}\s*:?\s*(.+)", re.IGNORECASE)
    m = pat.search(full_text)
    if not m:
        return ""
    return m.group(1).strip()


def prettify_activity(text: str) -> str:
    """
    Light post-processing for ACRA activity descriptions.
    Keeps it conservative to avoid damaging addresses/names.
    """
    if not text:
        return ""

    s = text.strip()

    # Fix common OCR merge: "ADVISORYSERVICES" -> "ADVISORY SERVICES"
    s = re.sub(r"\bADVISORYSERVICES\b", "ADVISORY SERVICES", s, flags=re.IGNORECASE)

    # Insert space after ')' if followed immediately by a letter
    s = re.sub(r"\)(?=[A-Z])", ") ", s)

    # Insert space between a lowercase letter followed by Uppercase
    s = re.sub(r"([a-z])([A-Z])", r"\1 \2", s)

    # Cleanup multiple spaces
    s = re.sub(r"\s+", " ", s)

    return s


def infer_llp_section(grid: List[List[str]], page_num: int, table_index: int) -> str:
    text = _norm(" ".join(" ".join(r) for r in grid))

    # Strong signals inside the grid
    if "WITHDRAWN" in text and "PARTNER" in text:
        return "WITHDRAWN_PARTNERS"
    if "WITHDRAWN" in text and "MANAGER" in text:
        return "WITHDRAWN_MANAGERS"
    if "PUBLIC ACCOUNTING EMPLOYEE" in text:
        return "EMPLOYEES"

    # If the table itself contains these titles
    if "PARTICULARS OF PARTNER" in text:
        return "PARTNERS"
    if "PARTICULARS OF MANAGER" in text:
        return "MANAGERS"

    # Fallback heuristic (based on your debug_tables):
    if page_num == 1:
        return "PARTNERS"
    if page_num == 2:
        return "MANAGERS"
    if page_num >= 3:
        return "WITHDRAWN_MANAGERS"

    return "UNKNOWN"


def infer_lp_section(grid: List[List[str]]) -> str:
    """
    LP page 2 typically has:
    - Particulars of Manager(s): PEOPLE_TABLE (no POSITION col)
    - Particulars of Partner(s): often classified as COMPANY_OFFICERS (has POSITION col)
    See sample PDF page 2. :contentReference[oaicite:2]{index=2}
    """
    sig = table_signature(grid)
    if "POSITION" in sig:
        return "PARTNERS"
    return "MANAGERS"

UEN_RE = re.compile(r"\b\d{4}[A-Z]\d{5}[A-Z]\b|\b[TSE]\d{2}[A-Z]{2}\d{4}[A-Z]\b", re.IGNORECASE)
# ^ keep simple; you can refine later. (UEN formats vary)

def looks_like_id(s: str) -> bool:
    s = (s or "").strip().upper()
    if not s:
        return False
    if NRIC_RE.search(s):
        return True
    if UEN_RE.search(s):
        return True
    # Sometimes IDs are OCR'd with missing last char; allow STFG + 7-8 digits
    if re.search(r"\b[STFG]\d{7,8}\b", s):
        return True
    return False

def looks_like_header_word(s: str) -> bool:
    s = _norm(s)
    return s in {"NAME", "IDENTIFICATION", "NUMBER", "CURRENCY", "AMOUNT", "AUDIT FIRM(S)", "AUDIT FIRMS", "CHARGE(S)", "CHARGES"}


# --------------------------------------------------
# 2. ENTITY TYPE DETECTION
# --------------------------------------------------

def detect_entity_type(kv_page_1: Dict[str, str]) -> Optional[str]:
    keys = set(kv_page_1.keys())

    if "name of llp" in keys:
        return "LLP"

    if "name of lp" in keys:
        return "LP"

    if "name of company" in keys or "company type" in keys:
        return "COMPANY"

    if "name of business" in keys or "constitution of business" in keys:
        return "BUSINESS"

    return None


# --------------------------------------------------
# 3. TABLE CLASSIFICATION
# --------------------------------------------------

def table_signature(grid: List[List[str]]) -> str:
    if not grid:
        return ""
    header_rows = grid[:2]
    text = " ".join(" ".join(r) for r in header_rows)
    return _norm(text)

TABLE_RULES = [
    ("CHARGES_TABLE", ["CHARGE", "DATE REGISTERED", "AMOUNT", "SECURED", "CHARGEE"], []),

    ("SHARE_CAPITAL_TABLE", ["AMOUNT", "NUMBER OF SHARES", "SHARE TYPE"], ["NAME", "IDENTIFICATION"]),

    ("SHAREHOLDERS_TABLE", ["NAME", "IDENTIFICATION", "NUMBER OF", "SHARES"], ["SHARE TYPE", "AMOUNT SECURED", "CHARGEE"]),

    ("COMPANY_OFFICERS", ["NAME", "IDENTIFICATION", "POSITION"], []),

    ("PEOPLE_TABLE", ["NAME", "IDENTIFICATION", "CITIZENSHIP"], []),

    ("RECEIPT_TABLE", ["RECEIPT", "DATE"], []),
]

def classify_table(grid):
    sig = table_signature(grid)
    if not sig:
        return None

    best_label = None
    best_score = 0

    for label, positives, negatives in TABLE_RULES:
        score = sum(1 for p in positives if p in sig)
        score -= sum(2 for n in negatives if n in sig)

        if score > best_score:
            best_score = score
            best_label = label

    return best_label if best_score >= 2 else None


# --------------------------------------------------
# 4. GENERIC PEOPLE PARSER
# --------------------------------------------------

# Relaxed: allow missing trailing letter due to OCR
NRIC_RE = re.compile(r"\b[STFG]\d{7,8}[A-Z]?\b", re.IGNORECASE)


def parse_people_from_grid(grid: List[List[str]]) -> List[Dict[str, Any]]:
    if not grid or len(grid) < 2:
        return []

    max_cols = max(len(r) for r in grid)
    rows = [r + [""] * (max_cols - len(r)) for r in grid]

    # Decide header height (1 or 2 rows)
    header_rows_to_use = 2 if len(rows) >= 2 else 1

    # If row 1 contains an NRIC/FIN, it's a data row (so header is just 1 row)
    if header_rows_to_use == 2 and NRIC_RE.search(" ".join(rows[1])):
        header_rows_to_use = 1

    header_rows = rows[:header_rows_to_use]

    headers = []
    for c in range(max_cols):
        parts = [header_rows[r][c] for r in range(len(header_rows))]
        headers.append(_norm(" ".join([p for p in parts if p])))

    def find_col(keywords):
        for i, h in enumerate(headers):
            if any(k in h for k in keywords):
                return i
        return None

    name_col = find_col(["NAME"])
    id_col   = find_col(["IDENTIFICATION", "NRIC", "FIN", "NUMBER"])
    nat_col  = find_col(["NATIONALITY", "CITIZENSHIP", "PLACE OF ORIGIN"])
    date_col = find_col(["APPOINTMENT", "DATE OF APPOINTMENT", "DATE"])
    pos_col  = find_col(["POSITION"])

    people: List[Dict[str, Any]] = []

    i = header_rows_to_use
    while i < len(rows):
        r = rows[i]
        row_text = " ".join(r)

        # skip section labels inside the table
        first_cell = _norm(r[0])
        if first_cell.startswith("WITHDRAWN") or first_cell.startswith("PARTICULARS OF"):
            i += 1
            continue

        m = NRIC_RE.search(row_text)

        # If no NRIC match but this looks like an officer/partner row (has POSITION + has a name),
        # still accept it and leave id_number as whatever is in the ID column.
        if not m:
            has_name = bool((r[name_col].strip() if name_col is not None and name_col < len(r) else r[0].strip()))
            has_position = (pos_col is not None and pos_col < len(r) and (r[pos_col] or "").strip())
            if not (has_name and has_position):
                i += 1
                continue
        
        # --- Extract raw name first ---
        raw_name = (r[name_col].strip() if name_col is not None and name_col < len(r) else r[0].strip())

        merged_addr = ""

        # If the name cell contains address text (DocumentAI merged "Name Address"),
        # split name from address
       # 1) HARD RULE: if there is a digit in the "name" cell, split at first digit
        m_digit = re.search(r"\d", raw_name)
        if m_digit:
            idx = m_digit.start()
            maybe_name = raw_name[:idx].strip(" ,")
            maybe_addr = raw_name[idx:].strip(" ,")
            if len(maybe_name) >= 2:
                raw_name = maybe_name
                merged_addr = maybe_addr

        # 2) If still no merged address, fall back to splitting at common address keywords
        if not merged_addr:
            m_addr = re.search(
                r"\b(BLK|BLOCK|ROAD|RD|STREET|ST|AVE|AVENUE|DRIVE|DR|CRESCENT|CRES|LANE|LN)\b",
                raw_name.upper()
            )
            if m_addr:
                idx = m_addr.start()
                maybe_name = raw_name[:idx].strip(" ,")
                maybe_addr = raw_name[idx:].strip(" ,")
                if len(maybe_name) >= 2:
                    raw_name = maybe_name
                    merged_addr = maybe_addr

        # 3) Final cleanup: ensure name has no digits even after splitting (paranoid)
        raw_name = re.sub(r"\d+", "", raw_name).strip(" ,")
        

        # Extract ID safely
        raw_id = (r[id_col].strip() if id_col is not None and id_col < len(r) else "")
        id_number = m.group(0).upper() if m else raw_id

        person = {
            "name": raw_name,
            "id_number": id_number,
            "nationality": (r[nat_col].strip() if nat_col is not None and nat_col < len(r) else ""),
            "role": "",
            "address": "",
            "appointed_date": (r[date_col].strip() if date_col is not None and date_col < len(r) else ""),
        }

        if pos_col is not None and pos_col < len(r):
            person["_position"] = (r[pos_col] or "").strip().upper()

        # Lookahead: next row is usually the address row
        if i + 1 < len(rows):
            nxt = rows[i + 1]
            nxt_text = " ".join(nxt)

            # Key idea: many ACRA tables use a 2-row-per-person format:
            # row A = name/id/nationality/date
            # row B = address + nationality continuation like "CITIZEN"
            nxt_has_nric = bool(NRIC_RE.search(nxt_text))

            nxt_id = ""
            if id_col is not None and id_col < len(nxt):
                nxt_id = (nxt[id_col] or "").strip()

            # If next row has no ID and no NRIC, treat it as a continuation row
            if (not nxt_has_nric) and (not nxt_id):
                # 1) Address candidate usually sits in column 0
                addr_candidate = (nxt[0] or "").strip()
                addr_up = _norm(addr_candidate)

                looks_like_addr = (
                    any(tok in addr_up for tok in ["SINGAPORE", "ROAD", "RD", "STREET", "ST", "AVE", "AVENUE", "BLK", "BUILDING", "CONDO"])
                    or "#" in addr_candidate
                    or "(" in addr_candidate
                    or any(ch.isdigit() for ch in addr_candidate)
                )

                if looks_like_addr and not person["address"]:
                    person["address"] = addr_candidate.strip(" ,")

                # 2) Nationality continuation often appears in nat_col (e.g., "CITIZEN")
                cont_nat = ""
                if nat_col is not None and nat_col < len(nxt):
                    cont_nat = (nxt[nat_col] or "").strip()

                if cont_nat:
                    cont_up = _norm(cont_nat)
                    # If we already have "SINGAPORE", turn it into "SINGAPORE CITIZEN"
                    if cont_up in ("CITIZEN", "SINGAPORE CITIZEN") and person.get("nationality"):
                        if "CITIZEN" not in _norm(person["nationality"]):
                            person["nationality"] = f"{person['nationality'].strip()} CITIZEN".strip()
                    elif not person.get("nationality"):
                        person["nationality"] = cont_nat.strip()
                                
                # 3) Position continuation (LP often splits "GENERAL" + "PARTNER")
                if pos_col is not None and pos_col < len(nxt):
                    cont_pos = (nxt[pos_col] or "").strip().upper()
                    if cont_pos:
                        curr_pos = (person.get("_position") or "").strip().upper()
                        # Merge "GENERAL" + "PARTNER" => "GENERAL PARTNER"
                        if curr_pos and cont_pos not in curr_pos:
                            person["_position"] = f"{curr_pos} {cont_pos}".strip()
                        elif not curr_pos:
                            person["_position"] = cont_pos

                i += 1
                    
        if not person["address"] and merged_addr:
            person["address"] = merged_addr

        people.append(person)
        i += 1

    return people

def parse_shareholders_from_grid(grid: List[List[str]]) -> List[Dict[str, Any]]:
    if not grid or len(grid) < 2:
        return []

    max_cols = max(len(r) for r in grid)
    rows = [r + [""] * (max_cols - len(r)) for r in grid]

    # shareholder tables usually use 2 header rows
    header_rows = rows[:2]
    headers = []
    for c in range(max_cols):
        parts = [header_rows[0][c], header_rows[1][c]]
        headers.append(_norm(" ".join([p for p in parts if p])))

    def find_col(keys):
        for i, h in enumerate(headers):
            if any(k in h for k in keys):
                return i
        return None

    name_col = find_col(["NAME"])
    id_col   = find_col(["IDENTIFICATION", "NRIC", "FIN", "NUMBER"])
    nat_col  = find_col(["NATIONALITY", "PLACE OF ORIGIN"])
    shares_col = find_col(["NUMBER OF", "SHARES"])   # tolerant for "Number of" + "Shares Currency"
    shares_currency_col = find_col(["SHARES CURRENCY", "SHARES", "CURRENCY"])

    out: List[Dict[str, Any]] = []
    i = 2

    while i < len(rows):
        r = rows[i]
        row_text = " ".join(r).strip()
        if not row_text:
            i += 1
            continue

        name = (r[name_col].strip() if name_col is not None and name_col < len(r) else r[0].strip())
        idv  = (r[id_col].strip() if id_col is not None and id_col < len(r) else "")

        shares_val = None
        if shares_col is not None and shares_col < len(r):
            shares_val = _parse_int(r[shares_col])

        # Only accept real shareholder rows
        if (not name) or looks_like_header_word(name) or (not looks_like_id(idv)) or (shares_val is None):
            i += 1
            continue

        sh: Dict[str, Any] = {
            "name": name,
            "id_number": idv,
            "country_of_residence": (r[nat_col].strip() if nat_col is not None and nat_col < len(r) else ""),
            "number_of_shares": shares_val,
            "address": "",
            "type": "INDIVIDUAL",
            "shareholding_percent": None,
            "share_class": "",
            "share_currency": "",
        }

        # Continuation row for address + citizenship + shares currency/class
        if i + 1 < len(rows):
            nxt = rows[i + 1]

            nxt_id = (nxt[id_col].strip() if id_col is not None and id_col < len(nxt) else "")
            if not nxt_id:
                # address usually in col0
                addr = (nxt[0] or "").strip()
                if addr:
                    sh["address"] = addr.strip(" ,")

                # nationality continuation e.g. "CITIZEN"
                if nat_col is not None and nat_col < len(nxt):
                    cont = (nxt[nat_col] or "").strip()
                    if cont and "CITIZEN" in _norm(cont) and "CITIZEN" not in _norm(sh["country_of_residence"]):
                        sh["country_of_residence"] = f"{sh['country_of_residence']} {cont}".strip()

                # shares currency/class usually in "Shares Currency" col
                if shares_currency_col is not None and shares_currency_col < len(nxt):
                    sc = (nxt[shares_currency_col] or "").strip()
                    # Example: "(ORDINARY) SINGAPORE, DOLLARS" :contentReference[oaicite:1]{index=1}
                    if sc:
                        m = re.search(r"\(([^)]+)\)\s*(.+)", sc)
                        if m:
                            sh["share_class"] = m.group(1).strip()
                            sh["share_currency"] = m.group(2).strip()
                        else:
                            sh["share_currency"] = sc.strip()

                i += 1  # consume continuation row

        # Corporate heuristic
        n = _norm(sh["name"])
        if any(x in n for x in ["PTE", "LTD", "LIMITED", "LLP", "INC", "CORP"]):
            sh["type"] = "CORPORATE"

        out.append(sh)
        i += 1

    return out

def parse_charges_from_grid(grid: List[List[str]]) -> List[Dict[str, Any]]:
    if not grid or len(grid) < 1:
        return []

    # Normalize ragged rows
    max_cols = max(len(r) for r in grid)
    rows = [r + [""] * (max_cols - len(r)) for r in grid]

    # Charges header is often 2 lines (like your debug table)
    header_rows_to_use = 2 if len(rows) >= 2 else 1
    header_rows = rows[:header_rows_to_use]

    headers = []
    for c in range(max_cols):
        parts = [header_rows[r][c] for r in range(len(header_rows))]
        headers.append(_norm(" ".join([p for p in parts if p])))

    def find_col(keywords):
        for i, h in enumerate(headers):
            if any(k in h for k in keywords):
                return i
        return None

    charge_no_col = find_col(["CHARGE", "CHARGE NUMBER"])
    date_col      = find_col(["DATE REGISTERED", "DATE"])
    curr_col      = find_col(["CURRENCY"])
    amt_col       = find_col(["AMOUNT", "AMOUNT SECURED", "SECURED"])
    chargee_col   = find_col(["CHARGEE", "CHARGEE(S)"])

    out: List[Dict[str, Any]] = []

    i = header_rows_to_use
    while i < len(rows):
        r = rows[i]
        row_text = " ".join(r).strip()
        if not row_text:
            i += 1
            continue

        # Try read charge number
        charge_no_raw = (r[charge_no_col].strip() if charge_no_col is not None and charge_no_col < len(r) else "")
        charge_no = _parse_int(charge_no_raw)

        # If there's no charge number, it’s probably an empty section / spacer row
        if charge_no is None:
            i += 1
            continue

        amt_raw = (r[amt_col].strip() if amt_col is not None and amt_col < len(r) else "")
        amt_val = _parse_int(amt_raw)

        rec = {
            "charge_number": charge_no,
            "date_registered": (r[date_col].strip() if date_col is not None and date_col < len(r) else ""),
            "currency": (r[curr_col].strip() if curr_col is not None and curr_col < len(r) else ""),
            "amount_secured": amt_val,
            "chargee": (r[chargee_col].strip() if chargee_col is not None and chargee_col < len(r) else ""),
        }
        out.append(rec)
        i += 1

    return out

# --------------------------------------------------
# 5. MAIN NORMALIZER
# --------------------------------------------------

def extract_acra_profile(
    kv_page_1: Dict[str, str],
    tables_by_page: List[List[Dict[str, Any]]],
    full_text: str = "",
) -> Dict[str, Any]:

    entity_type = detect_entity_type(kv_page_1)
    if not entity_type:
        raise ValueError("Unable to detect ACRA entity type.")

    profile = {
        "entity_type": entity_type,
        "name": "",
        "uen": "",
        "status": "",
        "status_date": "",
        "registration_date": "",
        "incorporation_date": "",
        "commencement_date": "",
        "expiry_date": "",
        "entity_subtype": "",
        "address": "",
        "primary_activity": "",
        "secondary_activity": "",
        "owners": [],
        "partners": [],
        "managers": [],
        "employees": [],
        "withdrawn_partners": [],
        "withdrawn_managers": [],
        "officers": [],
        "shareholders": [],
        "issued_shares_total": None,   # total issued shares for % calculation
        "charges": [],
        "charges_section_present": False,
    }

    # --------------------------------------------------
    # COMPANY
    # --------------------------------------------------
    if entity_type == "COMPANY":
        profile["name"] = kv_get_fuzzy(kv_page_1, "name of company")
        profile["uen"] = kv_get_fuzzy(kv_page_1, "uen")
        profile["incorporation_date"] = kv_get_fuzzy(kv_page_1, "incorporation date")
        profile["status"] = kv_get_fuzzy(kv_page_1, "status of company")
        profile["status_date"] = kv_get_fuzzy(kv_page_1, "status date")
        profile["entity_subtype"] = kv_get_fuzzy(kv_page_1, "company type")
        profile["address"] = kv_get_fuzzy(kv_page_1, "registered office address")
        profile["primary_activity"] = kv_get_fuzzy(kv_page_1, "primary activity")
        profile["secondary_activity"] = kv_get_fuzzy(kv_page_1, "secondary activity")
        

    # --------------------------------------------------
    # BUSINESS
    # --------------------------------------------------
    elif entity_type == "BUSINESS":
        profile["name"] = kv_get_fuzzy(kv_page_1, "name of business")
        profile["uen"] = kv_get_fuzzy(kv_page_1, "uen")
        profile["registration_date"] = kv_get_fuzzy(kv_page_1, "registration date")
        profile["commencement_date"] = kv_get_fuzzy(kv_page_1, "commencement date")
        profile["expiry_date"] = kv_get_fuzzy(kv_page_1, "expiry date")
        profile["status"] = kv_get_fuzzy(kv_page_1, "status of business")
        profile["status_date"] = kv_get_fuzzy(kv_page_1, "status date")
        profile["entity_subtype"] = kv_get_fuzzy(kv_page_1, "constitution of business")
        profile["address"] = kv_get_fuzzy(kv_page_1, "principal place of business")
        profile["primary_activity"] = kv_get_fuzzy(kv_page_1, "primary activity")
        profile["secondary_activity"] = kv_get_fuzzy(kv_page_1, "secondary activity")

    # --------------------------------------------------
    # LLP
    # --------------------------------------------------
    elif entity_type == "LLP":
        profile["name"] = kv_get_fuzzy(kv_page_1, "name of llp")
        profile["uen"] = kv_get_fuzzy(kv_page_1, "uen")
        profile["registration_date"] = kv_get_fuzzy(kv_page_1, "registration date")
        profile["status"] = kv_get_fuzzy(kv_page_1, "status of llp")
        profile["status_date"] = kv_get_fuzzy(kv_page_1, "status date")
        profile["address"] = kv_get_fuzzy(kv_page_1, "registered office address")
        profile["primary_activity"] = kv_get_fuzzy(kv_page_1, "primary activity")
        profile["secondary_activity"] = kv_get_fuzzy(kv_page_1, "secondary activity")

        if not profile["primary_activity"]:
            profile["primary_activity"] = text_get_activity(full_text, "Primary Activity")
        if not profile["secondary_activity"]:
            profile["secondary_activity"] = text_get_activity(full_text, "Secondary Activity")

    # --------------------------------------------------
    # LP
    # --------------------------------------------------
    elif entity_type == "LP":
        profile["name"] = kv_get_fuzzy(kv_page_1, "name of lp")
        profile["uen"] = kv_get_fuzzy(kv_page_1, "uen")
        profile["registration_date"] = kv_get_fuzzy(kv_page_1, "registration date")
        profile["commencement_date"] = kv_get_fuzzy(kv_page_1, "commencement date")
        profile["expiry_date"] = kv_get_fuzzy(kv_page_1, "expiry date")
        profile["status"] = kv_get_fuzzy(kv_page_1, "status of lp")
        profile["status_date"] = kv_get_fuzzy(kv_page_1, "status date")
        profile["address"] = kv_get_fuzzy(kv_page_1, "principal place of lp")
        profile["primary_activity"] = kv_get_fuzzy(kv_page_1, "primary activity")
        profile["secondary_activity"] = kv_get_fuzzy(kv_page_1, "secondary activity")

    # --------------------------------------------------
    # TABLE PARSING (all types)
    # --------------------------------------------------
    for p_i, page_tables in enumerate(tables_by_page):
        page_num = p_i + 1

        for t in page_tables:
            grid = t.get("grid") or []
            label = classify_table(grid)
            sig = table_signature(grid)

            is_charge_like = (
                "CHARGE" in sig and
                ("DATE REGISTERED" in sig or "AMOUNT" in sig or "SECURED" in sig or "CHARGEE" in sig)
            )

            if entity_type == "COMPANY" and (label == "CHARGES_TABLE" or is_charge_like):
                profile["charges_section_present"] = True
                profile["charges"].extend(parse_charges_from_grid(grid))
                continue

            # Issued share capital table
            if entity_type == "COMPANY" and label == "SHARE_CAPITAL_TABLE":
                # try to find the first number in the body rows for "Number of Shares"
                for row in grid[1:]:
                    for cell in row:
                        val = _parse_int(cell)
                        if val and val > 0:
                            profile["issued_shares_total"] = val
                            break
                    if profile["issued_shares_total"]:
                        break

            if entity_type == "COMPANY" and label == "SHAREHOLDERS_TABLE":
                    # extra guard: must have shareholder-like header
                sig = table_signature(grid)
                if not ("NAME" in sig and "IDENTIFICATION" in sig and "SHARES" in sig):
                    continue
                shs = parse_shareholders_from_grid(grid)

                total = profile.get("issued_shares_total")
                if total:
                    for s in shs:
                        n = s.get("number_of_shares")
                        if isinstance(n, int) and n >= 0:
                            s["shareholding_percent"] = round((n / total) * 100, 4)

                profile["shareholders"].extend(shs)
                continue

            # Detect charges table (even if empty)
            if entity_type == "COMPANY" and label == "CHARGES_TABLE":
                profile["charges_section_present"] = True
                profile["charges"].extend(parse_charges_from_grid(grid))
                continue

            # Decide which labels we want to parse depending on entity_type
            if entity_type in ("BUSINESS", "LP"):
                if label not in ("PEOPLE_TABLE", "COMPANY_OFFICERS"):
                    continue
            else:
                if label != "PEOPLE_TABLE":
                    continue

            people = parse_people_from_grid(grid)
            if not people:
                continue

            # -----------------------------
            # BUSINESS
            # -----------------------------
            if entity_type == "BUSINESS":
                owners = [p for p in people if p.get("_position") == "OWNER"]
                partners = [p for p in people if "PARTNER" in (p.get("_position") or "")]

                if owners:
                    for p in owners:
                        p["role"] = "OWNER"
                        p.pop("_position", None)
                    profile["owners"].extend(owners)

                elif partners:
                    for p in partners:
                        p["role"] = "PARTNER"
                        p.pop("_position", None)
                    profile["owners"].extend(partners)

                else:
                    # authorised representative table -> ignore or store separately
                    for p in people:
                        p.pop("_position", None)
                    # profile.setdefault("authorised_reps", []).extend(people)

            # -----------------------------
            # LP
            # -----------------------------
            elif entity_type == "LP":
                section = infer_lp_section(grid)

                if section == "PARTNERS":
                    for p in people:
                        pos = (p.get("_position") or "").upper()

                        if "GENERAL" in pos:
                            p["role"] = "GENERAL PARTNER"
                        elif "LIMITED" in pos:
                            p["role"] = "LIMITED PARTNER"
                        else:
                            p["role"] = "PARTNER"  # fallback

                        p.pop("_position", None)

                    profile["partners"].extend(people)

                else:  # MANAGERS
                    for p in people:
                        p["role"] = "MANAGER"
                        p.pop("_position", None)
                    profile["managers"].extend(people)

            # -----------------------------
            # LLP
            # -----------------------------
            elif entity_type == "LLP":
                section = infer_llp_section(grid, page_num=page_num, table_index=t.get("table_index", -1))

                if section == "PARTNERS":
                    for person in people:
                        person["role"] = "PARTNER"
                    profile["partners"].extend(people)

                elif section == "MANAGERS":
                    for person in people:
                        person["role"] = "MANAGER"
                    profile["managers"].extend(people)

                elif section == "EMPLOYEES":
                    for person in people:
                        person["role"] = "EMPLOYEE"
                    profile["employees"].extend(people)

                elif section == "WITHDRAWN_PARTNERS":
                    for person in people:
                        person["role"] = "WITHDRAWN_PARTNER"
                    profile["withdrawn_partners"].extend(people)

                elif section == "WITHDRAWN_MANAGERS":
                    for person in people:
                        person["role"] = "WITHDRAWN_MANAGER"
                    profile["withdrawn_managers"].extend(people)

                else:
                    for person in people:
                        person["role"] = "UNKNOWN"
                    profile["partners"].extend(people)

            # -----------------------------
            # COMPANY
            # -----------------------------
            elif entity_type == "COMPANY":
                profile["officers"].extend(people)

    profile["primary_activity"] = prettify_activity(profile["primary_activity"])
    profile["secondary_activity"] = prettify_activity(profile["secondary_activity"])

    return profile