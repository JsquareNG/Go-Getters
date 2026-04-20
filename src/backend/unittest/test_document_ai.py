import pytest
from unittest.mock import MagicMock, patch

from backend.services import document_ai as docai


def test_normalize_key():
    assert docai._normalize_key("  Hello World! ") == "hello world"
    assert docai._normalize_key("A@B#C123") == "abc123"


def test_clean_value():
    assert docai._clean_value("  Hello \n World ") == "Hello World"
    assert docai._clean_value(": value") == "value"
    assert docai._clean_value(None) == ""


def test_extract_text():
    mock_doc = MagicMock()
    mock_doc.text = "HelloWorld"

    mock_seg = MagicMock()
    mock_seg.start_index = 0
    mock_seg.end_index = 5

    mock_anchor = MagicMock()
    mock_anchor.text_segments = [mock_seg]

    result = docai._extract_text(mock_doc, mock_anchor)

    assert result == "Hello"


def test_cell_text():
    mock_doc = MagicMock()
    mock_doc.text = "HelloWorld"

    mock_cell = MagicMock()
    mock_cell.layout.text_anchor.text_segments = []

    result = docai._cell_text(mock_doc, mock_cell)

    assert result == ""


def test_table_to_grid():
    mock_doc = MagicMock()
    mock_doc.text = "abcdefghij"

    cell = MagicMock()
    cell.layout.text_anchor.text_segments = []

    row = MagicMock()
    row.cells = [cell, cell]

    table = MagicMock()
    table.header_rows = [row]
    table.body_rows = []

    grid = docai._table_to_grid(mock_doc, table)

    assert isinstance(grid, list)
    assert len(grid) == 1
    assert len(grid[0]) == 2


def test_merge_chunk_results():
    mock_doc = MagicMock()
    mock_doc.text = "text1"

    with patch("backend.services.document_ai.extract_kv_pairs_by_page", return_value=[{"a": "1"}]), \
         patch("backend.services.document_ai.extract_tables_by_page", return_value=[[{"table": 1}]] ):

        result = docai._merge_chunk_results([mock_doc])

    assert result["raw_text"] == "text1"
    assert result["kv_by_page"] == [{"a": "1"}]
    assert result["tables_by_page"] == [[{"table": 1}]]


def test_extract_kv_pairs_by_page():
    mock_doc = MagicMock()

    field = MagicMock()
    field.field_name.text_anchor.text_segments = []
    field.field_value.text_anchor.text_segments = []

    page = MagicMock()
    page.form_fields = [field]

    mock_doc.pages = [page]

    result = docai.extract_kv_pairs_by_page(mock_doc)

    assert isinstance(result, list)
    assert len(result) == 1


def test_extract_tables_by_page():
    mock_doc = MagicMock()

    table = MagicMock()
    table.header_rows = []
    table.body_rows = []

    page = MagicMock()
    page.tables = [table]

    mock_doc.pages = [page]

    result = docai.extract_tables_by_page(mock_doc)

    assert isinstance(result, list)
    assert len(result) == 1
    assert result[0][0]["table_index"] == 0


@patch("backend.services.document_ai._process_single_chunk")
@patch("backend.services.document_ai.PdfReader")
def test_process_document_bytes_single_chunk(mock_pdf_reader, mock_process):
    mock_pdf_reader.return_value.pages = [1] 

    mock_process.return_value = MagicMock(text="hello")

    result = docai.process_document_bytes(b"fake_pdf")

    assert result.text == "hello"


@patch("backend.services.document_ai._merge_chunk_results")
@patch("backend.services.document_ai._process_single_chunk")
@patch("backend.services.document_ai.PdfReader")
@patch("backend.services.document_ai._split_pdf_bytes")
def test_process_document_bytes_multi_chunk(
    mock_split, mock_pdf_reader, mock_process, mock_merge
):
    mock_pdf_reader.return_value.pages = list(range(20))  

    mock_split.return_value = [b"chunk1", b"chunk2"]
    mock_process.side_effect = ["doc1", "doc2"]
    mock_merge.return_value = {"merged": True}

    result = docai.process_document_bytes(b"fake_pdf")

    assert result == {"merged": True}


@patch("backend.services.document_ai.process_document_bytes")
def test_extract_document_layout_dict_path(mock_process):
    mock_process.return_value = {"raw_text": "test"}

    result = docai.extract_document_layout(b"pdf")

    assert result["raw_text"] == "test"


@patch("backend.services.document_ai.process_document_bytes")
def test_extract_document_layout_doc_path(mock_process):
    mock_doc = MagicMock()
    mock_doc.text = "hello"

    mock_process.return_value = mock_doc

    result = docai.extract_document_layout(b"pdf")

    assert result["raw_text"] == "hello"