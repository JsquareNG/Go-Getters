import json
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

import pytest

from backend.services.manual_review_ai_service import generate_manual_review_suggestions


CASES_PATH = Path(__file__).parent / "manual_review_eval_cases.json"


def load_cases():
    with open(CASES_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def normalize_text(value: str) -> str:
    return (value or "").strip().lower()


def extract_doc_names(output: dict) -> list[str]:
    docs = output.get("suggested_documents") or []
    names = []
    for d in docs:
        if isinstance(d, dict):
            names.append(normalize_text(d.get("document_name", "")))
        elif isinstance(d, str):
            names.append(normalize_text(d))
    return names


def extract_questions(output: dict) -> list[str]:
    questions = output.get("suggested_questions") or []
    return [normalize_text(q) for q in questions if isinstance(q, str)]


def assert_basic_output_shape(output: dict):
    assert isinstance(output, dict)
    assert output.get("recommended_action") in {"approve", "reject", "escalate"}
    assert "case_summary" in output
    assert "short_reason" in output
    assert "suggested_documents" in output
    assert "suggested_questions" in output
    assert isinstance(output["suggested_documents"], list)
    assert isinstance(output["suggested_questions"], list)


def make_mock_client(case_data):
    action = case_data["expected_action"]

    fake_payload = {
        "case_summary": f"Mock summary for {case_data['name']}",
        "short_reason": f"Mock reason for {action}",
        "recommended_action": action,
        "suggested_documents": [],
        "suggested_questions": [],
    }

    fake_response = SimpleNamespace(text=json.dumps(fake_payload))

    class FakeModels:
        def generate_content(self, *args, **kwargs):
            return fake_response

    class FakeClient:
        def __init__(self):
            self.models = FakeModels()

    return FakeClient()


@pytest.mark.parametrize("case_data", load_cases(), ids=lambda c: c["name"])
def test_manual_review_ai_cases(case_data):
    with patch(
        "backend.services.manual_review_ai_service.get_gemini_client",
        return_value=make_mock_client(case_data),
    ):
        output = generate_manual_review_suggestions(
            application_data=case_data["application_data"],
            risk_assessment=case_data["risk_assessment"],
            documents=case_data["documents"],
            action_requests=case_data["action_requests"],
        )

    assert_basic_output_shape(output)

    expected_action = case_data["expected_action"]
    assert output["recommended_action"] == expected_action, (
        f"Case '{case_data['name']}' failed: expected action "
        f"'{expected_action}', got '{output['recommended_action']}'. "
        f"Output: {json.dumps(output, indent=2)}"
    )

    if output["recommended_action"] in {"approve", "reject"}:
        assert output["suggested_documents"] == [], (
            f"Case '{case_data['name']}' failed: approve/reject should usually "
            f"return empty suggested_documents. Output: {json.dumps(output, indent=2)}"
        )
        assert output["suggested_questions"] == [], (
            f"Case '{case_data['name']}' failed: approve/reject should usually "
            f"return empty suggested_questions. Output: {json.dumps(output, indent=2)}"
        )

    forbidden_docs = [normalize_text(x) for x in case_data.get("forbidden_documents", [])]
    output_doc_names = extract_doc_names(output)
    for forbidden in forbidden_docs:
        assert forbidden not in output_doc_names, (
            f"Case '{case_data['name']}' failed: forbidden document '{forbidden}' "
            f"was suggested. Suggested docs: {output_doc_names}"
        )

    prior_questions = [
        normalize_text(ar.get("question", ""))
        for ar in case_data.get("action_requests", [])
        if ar.get("question") and ar.get("answer")
    ]
    output_questions = extract_questions(output)

    for pq in prior_questions:
        assert pq not in output_questions, (
            f"Case '{case_data['name']}' failed: repeated already-answered question '{pq}'. "
            f"Suggested questions: {output_questions}"
        )