
import os
import re
from typing import Dict, Optional, List, Any, Tuple
from google.cloud import documentai



def _norm(text: str) -> str:
    return re.sub(r"\s+", " ", (text or "").strip().upper())

def _get_company_type_from_text(full_text: str) -> Optional[str]:
    if not full_text:
        return None
    text = full_text.replace("\r\n", "\n").replace("\r", "\n")
    m = re.search(r"Company Type\s*:\s*(.+)", text, flags=re.IGNORECASE)
    if not m:
        return None
    # take only the first line
    return _norm(m.group(1).split("\n")[0])

def _normalize_key(text: str) -> str:
    text = (text or "").lower().strip()
    text = re.sub(r"[^a-z0-9 ]+", "", text)
    return text

def detect_entity_type_from_kv(kv: Dict[str, str]) -> Optional[str]:
    keys = set(kv.keys())  # already normalized in _extract_kv_pairs

    # LLP / LP are very explicit in ACRA PDFs
    if "name of llp" in keys or "status of llp" in keys:
        return "LLP"
    if "name of lp" in keys or "status of lp" in keys or "status of limited partnership" in keys:
        return "LP"

    # Sole prop / partnership typically show "Name of Business"
    if "name of business" in keys:
        # you can't distinguish sole prop vs partnership purely from this key alone reliably
        # (unless you also extract "company type"/"business type" etc)
        return "BUSINESS"  # temporary label, handle later

    # Companies
    if "name of company" in keys or "company name" in keys:
        return "COMPANY"

    return None

def validate_selected_entity_type(selected_norm: str, kv: Dict[str, str]) -> bool:
    keys = set(kv.keys())

    if selected_norm == "LLP":
        return "name of llp" in keys or "status of llp" in keys

    if selected_norm == "LP":
        return (
            "name of lp" in keys
            or "status of lp" in keys
            or "status of limited partnership" in keys
        )

    if selected_norm in ("PRIVATE_LIMITED", "PUBLIC_LIMITED"):
        return "name of company" in keys or "company name" in keys

    if selected_norm in ("SOLE_PROPRIETORSHIP", "PARTNERSHIP"):
        return "name of business" in keys

    return False

def detect_entity_type(document_text: str, kv: Dict[str, str]) -> Optional[str]:
    kv_detected = detect_entity_type_from_kv(kv)

    # LLP / LP already reliable
    if kv_detected == "LLP":
        return "LLP"
    if kv_detected == "LP":
        return "LP"

    # 🔥 NEW: check constitution of business first (for sole prop / partnership)
    constitution = kv.get("constitution of business")
    if constitution:
        ct = _norm(constitution).replace("-", " ")

        if "SOLE" in ct and "PROPRIETOR" in ct:
            return "SOLE_PROPRIETORSHIP"
        if "PARTNERSHIP" in ct and "LIMITED" not in ct:
            return "PARTNERSHIP"

    # Check company type field
    for key_candidate in ["company type", "entity type", "business type"]:
        company_type = kv.get(_normalize_key(key_candidate))
        if company_type:
            ct = _norm(company_type).replace("-", " ")

            if "PRIVATE" in ct:
                return "PRIVATE_LIMITED"
            if "PUBLIC" in ct:
                return "PUBLIC_LIMITED"
            if "SOLE" in ct and "PROPRIETOR" in ct:
                return "SOLE_PROPRIETORSHIP"
            if "PARTNERSHIP" in ct:
                return "PARTNERSHIP"

    # Fallback: try regex on full text
    text_type = _get_company_type_from_text(document_text)
    if text_type:
        ct = text_type.replace("-", " ")

        if "PRIVATE" in ct:
            return "PRIVATE_LIMITED"
        if "PUBLIC" in ct:
            return "PUBLIC_LIMITED"
        if "SOLE" in ct:
            return "SOLE_PROPRIETORSHIP"
        if "PARTNERSHIP" in ct:
            return "PARTNERSHIP"

    return None

def _extract_text(doc, text_anchor):
    if not text_anchor or not text_anchor.text_segments:
        return ""
    result = []
    for seg in text_anchor.text_segments:
        start = int(seg.start_index or 0)
        end = int(seg.end_index or 0)
        result.append(doc.text[start:end])
    return "".join(result).strip()


def _clean_value(text: str) -> str:
    if not text:
        return ""

    # Replace all newline types with space
    text = text.replace("\r\n", " ").replace("\n", " ").replace("\r", " ")

    # Remove leading colon if present
    text = re.sub(r"^:\s*", "", text)

    # Collapse multiple spaces
    text = re.sub(r"\s+", " ", text)

    return text.strip()



def _cell_text(doc, cell) -> str:
    # cell.layout.text_anchor exists in DocumentAI tables
    return _clean_value(_extract_text(doc, cell.layout.text_anchor))

def _table_to_grid(doc, table) -> List[List[str]]:
    """
    Returns a simple 2D grid of strings:
    - header rows first (if present)
    - then body rows
    """
    grid: List[List[str]] = []

    # Header rows
    for row in getattr(table, "header_rows", []) or []:
        grid.append([_cell_text(doc, c) for c in row.cells])

    # Body rows
    for row in getattr(table, "body_rows", []) or []:
        grid.append([_cell_text(doc, c) for c in row.cells])

    return grid

def _extract_tables_by_page(doc) -> List[List[Dict[str, Any]]]:
    """
    Returns tables grouped by page:
    [
      [ {table_index: 0, grid: [[...], ...]}, ...],   # page 1 tables
      [ {table_index: 0, grid: ...}, ...],            # page 2 tables
      ...
    ]
    """
    pages_tables: List[List[Dict[str, Any]]] = []

    for page in doc.pages:
        page_tables: List[Dict[str, Any]] = []
        for i, table in enumerate(getattr(page, "tables", []) or []):
            page_tables.append({
                "table_index": i,
                "grid": _table_to_grid(doc, table),
            })
        pages_tables.append(page_tables)

    return pages_tables

def _norm_cell(s: str) -> str:
    return re.sub(r"\s+", " ", (s or "").strip().upper())

def _find_table_by_headers(page_tables, required_headers):
    req = [_norm_cell(h) for h in required_headers]

    for t in page_tables:
        grid = t["grid"]
        if not grid:
            continue

        # combine up to first 2 rows into one header string list
        max_cols = max(len(r) for r in grid)
        padded = [r + [""] * (max_cols - len(r)) for r in grid]
        header_rows = padded[:2] if len(padded) >= 2 else padded[:1]

        combined = []
        for c in range(max_cols):
            parts = [header_rows[r][c] for r in range(len(header_rows))]
            combined.append(_norm_cell(" ".join([p for p in parts if p])))

        if all(any(r in h for h in combined) for r in req):
            return t

    return None


NRIC_RE = re.compile(r"\b[STFG]\d{7}[A-Z]\b", re.IGNORECASE)

def _extract_owner_from_table_grid(grid):
    if not grid or len(grid) < 2:
        return None

    max_cols = max(len(r) for r in grid)
    padded = [r + [""] * (max_cols - len(r)) for r in grid]

    # build combined headers from first 2 rows
    header_rows_to_use = 2 if len(padded) >= 2 else 1
    combined_headers = []
    for c in range(max_cols):
        parts = [padded[i][c] for i in range(header_rows_to_use)]
        combined_headers.append(" ".join([p for p in parts if p]).strip().upper())

    def col(keywords):
        for idx, h in enumerate(combined_headers):
            if any(k in h for k in keywords):
                return idx
        return None

    name_col = col(["NAME"]) or 0
    id_col = col(["IDENTIFICATION", "NRIC", "FIN"]) or 1
    pos_col = col(["POSITION"])  # might be None

    # collect candidate rows (rows containing NRIC)
    candidates = []
    for r in padded[1:]:
        if NRIC_RE.search(" ".join(r)):
            candidates.append(r)

    if not candidates:
        return None

    # prefer row where position is OWNER
    chosen = None
    if pos_col is not None:
        for r in candidates:
            if pos_col < len(r) and "OWNER" in (r[pos_col] or "").upper():
                chosen = r
                break
    if chosen is None:
        chosen = candidates[0]

    owner_name = chosen[name_col].strip() if name_col < len(chosen) else ""
    ident = chosen[id_col].strip() if id_col < len(chosen) else ""

    m = NRIC_RE.search(ident) or NRIC_RE.search(" ".join(chosen))
    if m:
        ident = m.group(0).upper()

    return {"owner_name": owner_name, "identification_number": ident}

def _extract_kv_pairs_by_page(doc) -> List[Dict[str, str]]:
    pages_kv: List[Dict[str, str]] = []

    for page in doc.pages:
        kv: Dict[str, str] = {}

        for field in page.form_fields:
            key = _extract_text(doc, field.field_name.text_anchor)
            value = _extract_text(doc, field.field_value.text_anchor)

            if not key:
                continue

            normalized_key = _normalize_key(key)
            cleaned_value = _clean_value(value)

            kv[normalized_key] = cleaned_value

        pages_kv.append(kv)

    return pages_kv


def extract_acra_data(pdf_bytes: bytes, selected_entity_type: str) -> Dict:
    project_id = os.getenv("GCP_PROJECT_ID")
    location = os.getenv("GCP_LOCATION")
    processor_id = os.getenv("DOC_AI_PROCESSOR_ID")

    client = documentai.DocumentProcessorServiceClient()
    name = client.processor_path(project_id, location, processor_id)

    request = documentai.ProcessRequest(
        name=name,
        raw_document=documentai.RawDocument(
            content=pdf_bytes,
            mime_type="application/pdf"
        ),
    )

    result = client.process_document(request=request)
    document = result.document

    pages_kv = _extract_kv_pairs_by_page(document)
    kv_page_1 = pages_kv[0] if pages_kv else {}

    selected = (selected_entity_type or "").strip().upper()

    ALLOWED = {
        "SOLE PROPRIETORSHIP": "SOLE_PROPRIETORSHIP",
        "SOLE PROPRIETOR": "SOLE_PROPRIETORSHIP",
        "PARTNERSHIP": "PARTNERSHIP",
        "LP": "LP",
        "LIMITED PARTNERSHIP": "LP",
        "LLP": "LLP",
        "PRIVATE LIMITED": "PRIVATE_LIMITED",
        "PRIVATE_LIMITED": "PRIVATE_LIMITED",
        "PUBLIC LIMITED": "PUBLIC_LIMITED",
        "PUBLIC_LIMITED": "PUBLIC_LIMITED",
    }
    selected_norm = ALLOWED.get(selected, selected)

    # ✅ Validate against page 1 structure (since you care about page 1)
    if not validate_selected_entity_type(selected_norm, kv_page_1):
        raise ValueError(
            f"Entity type mismatch or unsupported document format. "
            f"You selected '{selected_norm}', but extracted page-1 keys were: "
            f"{list(kv_page_1.keys())[:30]}"
        )

    return {
        "entity_type": selected_norm,
        "kv_page_1": kv_page_1,  
        # optional extras if you want:
        # "kv_all_pages": pages_kv,
        # "raw_text": document.text,  # careful: huge
    }

def extract_acra_data_auto(pdf_bytes: bytes) -> Dict:
    project_id = os.getenv("GCP_PROJECT_ID")
    location = os.getenv("GCP_LOCATION")
    processor_id = os.getenv("DOC_AI_PROCESSOR_ID")

    client = documentai.DocumentProcessorServiceClient()
    name = client.processor_path(project_id, location, processor_id)

    request = documentai.ProcessRequest(
        name=name,
        raw_document=documentai.RawDocument(
            content=pdf_bytes,
            mime_type="application/pdf"
        ),
    )

    result = client.process_document(request=request)
    document = result.document

    pages_kv = _extract_kv_pairs_by_page(document)
    kv_page_1 = pages_kv[0] if pages_kv else {}

    detected = detect_entity_type(document.text, kv_page_1)

    if not detected:
        raise ValueError(
            "Unable to auto-detect entity type from the document. "
            "Please use /extract-acra with an explicit entity_type."
        )

    if not validate_selected_entity_type(detected, kv_page_1):
        raise ValueError(
            f"Auto-detected entity type '{detected}' but validation failed. "
            f"Extracted page-1 keys were: {list(kv_page_1.keys())[:30]}"
        )

    return {
        "entity_type": detected,
        "kv_page_1": kv_page_1,
        # optional extras:
        # "kv_all_pages": pages_kv,
        # "raw_text": document.text,
    }

def extract_acra_data_with_tables(pdf_bytes: bytes) -> Dict:
    project_id = os.getenv("GCP_PROJECT_ID")
    location = os.getenv("GCP_LOCATION")
    processor_id = os.getenv("DOC_AI_PROCESSOR_ID")

    client = documentai.DocumentProcessorServiceClient()
    name = client.processor_path(project_id, location, processor_id)

    request = documentai.ProcessRequest(
        name=name,
        raw_document=documentai.RawDocument(content=pdf_bytes, mime_type="application/pdf"),
    )

    result = client.process_document(request=request)
    document = result.document

    pages_kv = _extract_kv_pairs_by_page(document)
    kv_page_1 = pages_kv[0] if pages_kv else {}

    # ✅ Auto-detect entity type (reuse your existing function)
    detected = detect_entity_type(document.text, kv_page_1)
    if not detected:
        raise ValueError("Unable to auto-detect entity type from the document.")

    # ✅ Validate detected type against page 1 structure
    if not validate_selected_entity_type(detected, kv_page_1):
        raise ValueError(
            f"Auto-detected entity type '{detected}' but validation failed. "
            f"Extracted page-1 keys were: {list(kv_page_1.keys())[:30]}"
        )

    tables_by_page = _extract_tables_by_page(document)

    owner_info = None
    if len(tables_by_page) >= 2:
        page2_tables = tables_by_page[1]

        # ✅ force the table that includes Position (your table_index 1 case)
        t = _find_table_by_headers(
            page2_tables,
            required_headers=["Name", "Identification", "Position"]
        )
        if t:
            owner_info = _extract_owner_from_table_grid(t["grid"])

    return {
        "entity_type": detected,
        "kv_page_1": kv_page_1,
        "tables_by_page": tables_by_page,
        "owner": owner_info,
    }