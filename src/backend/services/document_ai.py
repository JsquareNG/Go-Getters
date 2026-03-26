import io
import os
import re
from typing import Dict, List, Any

from google.cloud import documentai
from pypdf import PdfReader, PdfWriter


MAX_SYNC_PAGES = 15


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

    for page in getattr(doc, "pages", []) or []:
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

    for page in getattr(doc, "pages", []) or []:
        kv: Dict[str, str] = {}

        for field in getattr(page, "form_fields", []) or []:
            key = _extract_text(doc, field.field_name.text_anchor)
            value = _extract_text(doc, field.field_value.text_anchor)

            if not key:
                continue

            normalized_key = _normalize_key(key)
            cleaned_value = _clean_value(value)
            kv[normalized_key] = cleaned_value

        pages_kv.append(kv)

    return pages_kv


def _get_client_and_processor_name():
    project_id = os.getenv("GCP_PROJECT_ID")
    location = os.getenv("GCP_LOCATION")
    processor_id = os.getenv("DOC_AI_PROCESSOR_ID")

    if not project_id or not location or not processor_id:
        raise ValueError("Missing one of GCP_PROJECT_ID, GCP_LOCATION, DOC_AI_PROCESSOR_ID")

    client = documentai.DocumentProcessorServiceClient()
    name = client.processor_path(project_id, location, processor_id)
    return client, name


def _process_single_chunk(file_bytes: bytes, mime_type: str):
    client, name = _get_client_and_processor_name()

    request = documentai.ProcessRequest(
        name=name,
        raw_document=documentai.RawDocument(
            content=file_bytes,
            mime_type=mime_type,
        ),
    )

    result = client.process_document(request=request)
    return result.document


def _split_pdf_bytes(file_bytes: bytes, chunk_size: int = MAX_SYNC_PAGES) -> List[bytes]:
    reader = PdfReader(io.BytesIO(file_bytes))
    total_pages = len(reader.pages)

    chunks: List[bytes] = []

    for start in range(0, total_pages, chunk_size):
        writer = PdfWriter()
        end = min(start + chunk_size, total_pages)

        for i in range(start, end):
            writer.add_page(reader.pages[i])

        output = io.BytesIO()
        writer.write(output)
        chunks.append(output.getvalue())

    return chunks


def _merge_chunk_results(documents: List[Any]) -> Dict[str, Any]:
    raw_text_parts: List[str] = []
    kv_by_page: List[Dict[str, str]] = []
    tables_by_page: List[List[Dict[str, Any]]] = []

    for doc in documents:
        raw_text_parts.append(getattr(doc, "text", "") or "")
        kv_by_page.extend(extract_kv_pairs_by_page(doc))
        tables_by_page.extend(extract_tables_by_page(doc))

    return {
        "document": None,  # merged pseudo result; not a real DocumentAI Document object
        "raw_text": "\n\n".join([t for t in raw_text_parts if t]),
        "kv_by_page": kv_by_page,
        "tables_by_page": tables_by_page,
    }


def process_document_bytes(file_bytes: bytes, mime_type: str = "application/pdf"):
    """
    For PDFs:
    - if <= 15 pages: process directly
    - if > 15 pages: split into 15-page chunks and process each chunk synchronously

    For images:
    - process directly
    """
    if mime_type != "application/pdf":
        return _process_single_chunk(file_bytes, mime_type)

    reader = PdfReader(io.BytesIO(file_bytes))
    total_pages = len(reader.pages)

    if total_pages <= MAX_SYNC_PAGES:
        return _process_single_chunk(file_bytes, mime_type)

    pdf_chunks = _split_pdf_bytes(file_bytes, chunk_size=MAX_SYNC_PAGES)
    chunk_documents = [_process_single_chunk(chunk, mime_type) for chunk in pdf_chunks]
    return _merge_chunk_results(chunk_documents)


def extract_document_layout(file_bytes: bytes, mime_type: str = "application/pdf") -> Dict[str, Any]:
    result = process_document_bytes(file_bytes, mime_type)

    # If split/merged path was used, process_document_bytes already returns final dict
    if isinstance(result, dict):
        return result

    # Normal single-document path
    return {
        "document": result,
        "raw_text": result.text,
        "kv_by_page": extract_kv_pairs_by_page(result),
        "tables_by_page": extract_tables_by_page(result),
    }