import os
import re
from typing import Dict, List, Any
from google.cloud import documentai


def _normalize_key(text: str) -> str:
    text = (text or "").lower().strip()
    text = re.sub(r"[^a-z0-9 ]+", "", text)
    return text


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

    text = text.replace("\r\n", " ").replace("\n", " ").replace("\r", " ")
    text = re.sub(r"^:\s*", "", text)
    text = re.sub(r"\s+", " ", text)

    return text.strip()


def _cell_text(doc, cell) -> str:
    return _clean_value(_extract_text(doc, cell.layout.text_anchor))


def _table_to_grid(doc, table) -> List[List[str]]:

    grid: List[List[str]] = []

    for row in getattr(table, "header_rows", []) or []:
        grid.append([_cell_text(doc, c) for c in row.cells])

    for row in getattr(table, "body_rows", []) or []:
        grid.append([_cell_text(doc, c) for c in row.cells])

    return grid


def extract_tables_by_page(doc) -> List[List[Dict[str, Any]]]:
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


def extract_kv_pairs_by_page(doc) -> List[Dict[str, str]]:
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


def process_document_bytes(file_bytes: bytes, mime_type: str = "application/pdf"):
    project_id = os.getenv("GCP_PROJECT_ID")
    location = os.getenv("GCP_LOCATION")
    processor_id = os.getenv("DOC_AI_PROCESSOR_ID")

    client = documentai.DocumentProcessorServiceClient()
    name = client.processor_path(project_id, location, processor_id)

    request = documentai.ProcessRequest(
        name=name,
        raw_document=documentai.RawDocument(
            content=file_bytes,
            mime_type=mime_type,
        ),
    )

    result = client.process_document(request=request)
    return result.document


def extract_document_layout(file_bytes: bytes, mime_type: str = "application/pdf") -> Dict[str, Any]:
    document = process_document_bytes(file_bytes, mime_type)

    return {
        "document": document,
        "raw_text": document.text,
        "kv_by_page": extract_kv_pairs_by_page(document),
        "tables_by_page": extract_tables_by_page(document),
    }