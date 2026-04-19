import io
import os
import re
from typing import Dict, List, Any, Optional

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


def _safe_conf(value) -> Optional[float]:
    try:
        if value is None:
            return None
        value = float(value)
        if 0.0 <= value <= 1.0:
            return value
        return None
    except Exception:
        return None


def _mean(values: List[float]) -> Optional[float]:
    if not values:
        return None
    return sum(values) / len(values)


def _min(values: List[float]) -> Optional[float]:
    if not values:
        return None
    return min(values)


def _max(values: List[float]) -> Optional[float]:
    if not values:
        return None
    return max(values)


def _layout_confidence(layout_obj) -> Optional[float]:
    if not layout_obj:
        return None
    return _safe_conf(getattr(layout_obj, "confidence", None))


def _collect_page_confidences(page) -> Dict[str, Any]:
    token_confidences: List[float] = []
    line_confidences: List[float] = []
    paragraph_confidences: List[float] = []
    block_confidences: List[float] = []

    for token in getattr(page, "tokens", []) or []:
        conf = _layout_confidence(getattr(token, "layout", None))
        if conf is not None:
            token_confidences.append(conf)

    for line in getattr(page, "lines", []) or []:
        conf = _layout_confidence(getattr(line, "layout", None))
        if conf is not None:
            line_confidences.append(conf)

    for paragraph in getattr(page, "paragraphs", []) or []:
        conf = _layout_confidence(getattr(paragraph, "layout", None))
        if conf is not None:
            paragraph_confidences.append(conf)

    for block in getattr(page, "blocks", []) or []:
        conf = _layout_confidence(getattr(block, "layout", None))
        if conf is not None:
            block_confidences.append(conf)

    mean_token_confidence = _mean(token_confidences)
    mean_line_confidence = _mean(line_confidences)
    mean_paragraph_confidence = _mean(paragraph_confidences)
    mean_block_confidence = _mean(block_confidences)

    page_conf_candidates = [
        x for x in [
            mean_token_confidence,
            mean_line_confidence,
            mean_paragraph_confidence,
            mean_block_confidence,
        ]
        if x is not None
    ]

    page_mean_confidence = _mean(page_conf_candidates)

    all_available_confidences = (
        token_confidences
        or line_confidences
        or paragraph_confidences
        or block_confidences
    )

    page_min_confidence = _min(all_available_confidences)
    page_max_confidence = _max(all_available_confidences)

    low_conf_token_count = len([x for x in token_confidences if x < 0.50])

    return {
        "token_count": len(token_confidences),
        "line_count": len(line_confidences),
        "paragraph_count": len(paragraph_confidences),
        "block_count": len(block_confidences),
        "mean_token_confidence": round(mean_token_confidence, 4) if mean_token_confidence is not None else None,
        "mean_line_confidence": round(mean_line_confidence, 4) if mean_line_confidence is not None else None,
        "mean_paragraph_confidence": round(mean_paragraph_confidence, 4) if mean_paragraph_confidence is not None else None,
        "mean_block_confidence": round(mean_block_confidence, 4) if mean_block_confidence is not None else None,
        "page_mean_confidence": round(page_mean_confidence, 4) if page_mean_confidence is not None else None,
        "page_min_confidence": round(page_min_confidence, 4) if page_min_confidence is not None else None,
        "page_max_confidence": round(page_max_confidence, 4) if page_max_confidence is not None else None,
        "low_conf_token_count": low_conf_token_count,
        "low_conf_token_ratio": round(low_conf_token_count / len(token_confidences), 4) if token_confidences else None,
    }


def extract_ocr_confidence_stats(doc, raw_text: str = "") -> Dict[str, Any]:
    pages = getattr(doc, "pages", []) or []
    page_stats: List[Dict[str, Any]] = []

    all_token_conf: List[float] = []
    all_line_conf: List[float] = []
    all_paragraph_conf: List[float] = []
    all_block_conf: List[float] = []
    all_page_means: List[float] = []
    all_page_mins: List[float] = []
    low_conf_token_total = 0
    token_total = 0

    for idx, page in enumerate(pages, start=1):
        stats = _collect_page_confidences(page)
        stats["page_number"] = idx
        page_stats.append(stats)

        for token in getattr(page, "tokens", []) or []:
            conf = _layout_confidence(getattr(token, "layout", None))
            if conf is not None:
                all_token_conf.append(conf)

        for line in getattr(page, "lines", []) or []:
            conf = _layout_confidence(getattr(line, "layout", None))
            if conf is not None:
                all_line_conf.append(conf)

        for paragraph in getattr(page, "paragraphs", []) or []:
            conf = _layout_confidence(getattr(paragraph, "layout", None))
            if conf is not None:
                all_paragraph_conf.append(conf)

        for block in getattr(page, "blocks", []) or []:
            conf = _layout_confidence(getattr(block, "layout", None))
            if conf is not None:
                all_block_conf.append(conf)

        if stats.get("page_mean_confidence") is not None:
            all_page_means.append(float(stats["page_mean_confidence"]))
        if stats.get("page_min_confidence") is not None:
            all_page_mins.append(float(stats["page_min_confidence"]))

        low_conf_token_total += int(stats.get("low_conf_token_count") or 0)
        token_total += int(stats.get("token_count") or 0)

    primary_confidence = (
        _mean(all_token_conf)
        if all_token_conf else
        _mean(all_line_conf)
        if all_line_conf else
        _mean(all_paragraph_conf)
        if all_paragraph_conf else
        _mean(all_block_conf)
        if all_block_conf else
        None
    )

    return {
        "pages_analyzed": len(page_stats),
        "raw_text_length": len(raw_text or ""),
        "primary_confidence_metric": (
            "token_mean" if all_token_conf else
            "line_mean" if all_line_conf else
            "paragraph_mean" if all_paragraph_conf else
            "block_mean" if all_block_conf else
            "unavailable"
        ),
        "primary_confidence": round(primary_confidence, 4) if primary_confidence is not None else None,
        "mean_token_confidence": round(_mean(all_token_conf), 4) if all_token_conf else None,
        "mean_line_confidence": round(_mean(all_line_conf), 4) if all_line_conf else None,
        "mean_paragraph_confidence": round(_mean(all_paragraph_conf), 4) if all_paragraph_conf else None,
        "mean_block_confidence": round(_mean(all_block_conf), 4) if all_block_conf else None,
        "mean_page_confidence": round(_mean(all_page_means), 4) if all_page_means else None,
        "min_page_confidence": round(_min(all_page_mins), 4) if all_page_mins else None,
        "max_page_confidence": round(_max(all_page_means), 4) if all_page_means else None,
        "token_count": len(all_token_conf),
        "line_count": len(all_line_conf),
        "paragraph_count": len(all_paragraph_conf),
        "block_count": len(all_block_conf),
        "low_conf_token_count": low_conf_token_total,
        "low_conf_token_ratio": round(low_conf_token_total / token_total, 4) if token_total else None,
        "page_stats": page_stats,
    }


def _merge_ocr_confidence_stats(stat_list: List[Dict[str, Any]], raw_text: str) -> Dict[str, Any]:
    if not stat_list:
        return {
            "pages_analyzed": 0,
            "raw_text_length": len(raw_text or ""),
            "primary_confidence_metric": "unavailable",
            "primary_confidence": None,
            "mean_token_confidence": None,
            "mean_line_confidence": None,
            "mean_paragraph_confidence": None,
            "mean_block_confidence": None,
            "mean_page_confidence": None,
            "min_page_confidence": None,
            "max_page_confidence": None,
            "token_count": 0,
            "line_count": 0,
            "paragraph_count": 0,
            "block_count": 0,
            "low_conf_token_count": 0,
            "low_conf_token_ratio": None,
            "page_stats": [],
        }

    page_stats: List[Dict[str, Any]] = []
    primary_values: List[float] = []
    mean_page_values: List[float] = []
    min_page_values: List[float] = []

    token_count = 0
    line_count = 0
    paragraph_count = 0
    block_count = 0
    low_conf_token_count = 0

    next_page_number = 1

    for stats in stat_list:
        for page in stats.get("page_stats", []) or []:
            page_copy = dict(page)
            page_copy["page_number"] = next_page_number
            next_page_number += 1
            page_stats.append(page_copy)

        if stats.get("primary_confidence") is not None:
            primary_values.append(float(stats["primary_confidence"]))
        if stats.get("mean_page_confidence") is not None:
            mean_page_values.append(float(stats["mean_page_confidence"]))
        if stats.get("min_page_confidence") is not None:
            min_page_values.append(float(stats["min_page_confidence"]))

        token_count += int(stats.get("token_count") or 0)
        line_count += int(stats.get("line_count") or 0)
        paragraph_count += int(stats.get("paragraph_count") or 0)
        block_count += int(stats.get("block_count") or 0)
        low_conf_token_count += int(stats.get("low_conf_token_count") or 0)

    primary_confidence = _mean(primary_values)

    return {
        "pages_analyzed": len(page_stats),
        "raw_text_length": len(raw_text or ""),
        "primary_confidence_metric": "merged_primary_mean",
        "primary_confidence": round(primary_confidence, 4) if primary_confidence is not None else None,
        "mean_token_confidence": None,
        "mean_line_confidence": None,
        "mean_paragraph_confidence": None,
        "mean_block_confidence": None,
        "mean_page_confidence": round(_mean(mean_page_values), 4) if mean_page_values else None,
        "min_page_confidence": round(_min(min_page_values), 4) if min_page_values else None,
        "max_page_confidence": round(_max(mean_page_values), 4) if mean_page_values else None,
        "token_count": token_count,
        "line_count": line_count,
        "paragraph_count": paragraph_count,
        "block_count": block_count,
        "low_conf_token_count": low_conf_token_count,
        "low_conf_token_ratio": round(low_conf_token_count / token_count, 4) if token_count else None,
        "page_stats": page_stats,
    }


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
    confidence_parts: List[Dict[str, Any]] = []

    for doc in documents:
        chunk_raw_text = getattr(doc, "text", "") or ""
        raw_text_parts.append(chunk_raw_text)
        kv_by_page.extend(extract_kv_pairs_by_page(doc))
        tables_by_page.extend(extract_tables_by_page(doc))
        confidence_parts.append(extract_ocr_confidence_stats(doc, raw_text=chunk_raw_text))

    merged_raw_text = "\n\n".join([t for t in raw_text_parts if t])

    return {
        "document": None,
        "raw_text": merged_raw_text,
        "kv_by_page": kv_by_page,
        "tables_by_page": tables_by_page,
        "ocr_confidence_stats": _merge_ocr_confidence_stats(confidence_parts, merged_raw_text),
    }


def process_document_bytes(file_bytes: bytes, mime_type: str = "application/pdf"):
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

    if isinstance(result, dict):
        return result

    raw_text = result.text or ""

    return {
        "document": result,
        "raw_text": raw_text,
        "kv_by_page": extract_kv_pairs_by_page(result),
        "tables_by_page": extract_tables_by_page(result),
        "ocr_confidence_stats": extract_ocr_confidence_stats(result, raw_text=raw_text),
    }