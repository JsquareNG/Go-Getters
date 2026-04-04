import pytest
from fastapi import HTTPException

import backend.api.smart_ai as manual_review_ai_module


# ----------------------------
# Helpers
# ----------------------------

class FakeRequestedDocument:
    def __init__(self, data):
        self._data = data

    def model_dump(self):
        return self._data


class FakeManualReviewPayload:
    def __init__(
        self,
        application_data=None,
        risk_assessment=None,
        documents=None,
        action_requests=None,
    ):
        self.application_data = application_data or {}
        self.risk_assessment = risk_assessment or {}
        self.documents = documents or []
        self.action_requests = action_requests or []


class FakeBulkAlternativePayload:
    def __init__(
        self,
        requested_documents=None,
        application_data=None,
        risk_assessment=None,
        documents=None,
        action_requests=None,
    ):
        self.requested_documents = requested_documents or []
        self.application_data = application_data or {}
        self.risk_assessment = risk_assessment or {}
        self.documents = documents or []
        self.action_requests = action_requests or []


# ----------------------------
# generate_ai_suggestions
# ----------------------------

def test_generate_ai_suggestions_returns_success(monkeypatch):
    captured = {}

    def fake_generate_manual_review_suggestions(
        application_data,
        risk_assessment,
        documents,
        action_requests,
    ):
        captured["application_data"] = application_data
        captured["risk_assessment"] = risk_assessment
        captured["documents"] = documents
        captured["action_requests"] = action_requests

        return {
            "recommended_action": "approve",
            "case_summary": "Looks acceptable",
            "reasons": ["All required documents are present"],
        }

    monkeypatch.setattr(
        manual_review_ai_module,
        "generate_manual_review_suggestions",
        fake_generate_manual_review_suggestions,
    )

    payload = FakeManualReviewPayload(
        application_data={"application_id": "APP-001", "business_name": "Acme Pte Ltd"},
        risk_assessment={"risk_score": 20, "risk_grade": "LOW"},
        documents=[{"document_type": "ACRA"}],
        action_requests=[{"status": "OPEN"}],
    )

    result = manual_review_ai_module.generate_ai_suggestions(payload)

    assert result["success"] is True
    assert result["data"]["recommended_action"] == "approve"
    assert result["data"]["case_summary"] == "Looks acceptable"

    assert captured["application_data"] == {"application_id": "APP-001", "business_name": "Acme Pte Ltd"}
    assert captured["risk_assessment"] == {"risk_score": 20, "risk_grade": "LOW"}
    assert captured["documents"] == [{"document_type": "ACRA"}]
    assert captured["action_requests"] == [{"status": "OPEN"}]


def test_generate_ai_suggestions_raises_http_500_on_error(monkeypatch):
    def fake_generate_manual_review_suggestions(
        application_data,
        risk_assessment,
        documents,
        action_requests,
    ):
        raise RuntimeError("manual review AI failed")

    monkeypatch.setattr(
        manual_review_ai_module,
        "generate_manual_review_suggestions",
        fake_generate_manual_review_suggestions,
    )

    payload = FakeManualReviewPayload(
        application_data={"application_id": "APP-001"},
        risk_assessment={"risk_score": 50},
        documents=[],
        action_requests=[],
    )

    with pytest.raises(HTTPException) as exc:
        manual_review_ai_module.generate_ai_suggestions(payload)

    assert exc.value.status_code == 500
    assert exc.value.detail == "manual review AI failed"


# ----------------------------
# generate_bulk_alternative_documents
# ----------------------------

def test_generate_bulk_alternative_documents_returns_success(monkeypatch):
    captured = {}

    def fake_generate_bulk_alternative_document_options(
        requested_documents,
        application_data,
        risk_assessment,
        documents,
        action_requests,
    ):
        captured["requested_documents"] = requested_documents
        captured["application_data"] = application_data
        captured["risk_assessment"] = risk_assessment
        captured["documents"] = documents
        captured["action_requests"] = action_requests

        return [
            {
                "item_id": "DOC-1",
                "alternatives": [
                    {
                        "document_name": "Bank Statement",
                        "reason": "Can support proof of address",
                    }
                ],
            }
        ]

    monkeypatch.setattr(
        manual_review_ai_module,
        "generate_bulk_alternative_document_options",
        fake_generate_bulk_alternative_document_options,
    )

    payload = FakeBulkAlternativePayload(
        requested_documents=[
            FakeRequestedDocument(
                {
                    "item_id": "DOC-1",
                    "document_name": "Utility Bill",
                    "document_desc": "Recent residential proof",
                }
            ),
            FakeRequestedDocument(
                {
                    "item_id": "DOC-2",
                    "document_name": "Proof of Income",
                    "document_desc": "Latest supporting evidence",
                }
            ),
        ],
        application_data={"application_id": "APP-001", "country": "SG"},
        risk_assessment={"risk_score": 35, "risk_grade": "MEDIUM"},
        documents=[{"document_type": "ACRA"}],
        action_requests=[{"status": "OPEN"}],
    )

    result = manual_review_ai_module.generate_bulk_alternative_documents(payload)

    assert result["success"] is True
    assert isinstance(result["data"], list)
    assert result["data"][0]["item_id"] == "DOC-1"
    assert result["data"][0]["alternatives"][0]["document_name"] == "Bank Statement"

    assert captured["requested_documents"] == [
        {
            "item_id": "DOC-1",
            "document_name": "Utility Bill",
            "document_desc": "Recent residential proof",
        },
        {
            "item_id": "DOC-2",
            "document_name": "Proof of Income",
            "document_desc": "Latest supporting evidence",
        },
    ]
    assert captured["application_data"] == {"application_id": "APP-001", "country": "SG"}
    assert captured["risk_assessment"] == {"risk_score": 35, "risk_grade": "MEDIUM"}
    assert captured["documents"] == [{"document_type": "ACRA"}]
    assert captured["action_requests"] == [{"status": "OPEN"}]


def test_generate_bulk_alternative_documents_raises_http_500_on_error(monkeypatch):
    def fake_generate_bulk_alternative_document_options(
        requested_documents,
        application_data,
        risk_assessment,
        documents,
        action_requests,
    ):
        raise RuntimeError("alternative document AI failed")

    monkeypatch.setattr(
        manual_review_ai_module,
        "generate_bulk_alternative_document_options",
        fake_generate_bulk_alternative_document_options,
    )

    payload = FakeBulkAlternativePayload(
        requested_documents=[
            FakeRequestedDocument(
                {
                    "item_id": "DOC-1",
                    "document_name": "Utility Bill",
                }
            )
        ],
        application_data={"application_id": "APP-001"},
        risk_assessment={"risk_score": 50},
        documents=[],
        action_requests=[],
    )

    with pytest.raises(HTTPException) as exc:
        manual_review_ai_module.generate_bulk_alternative_documents(payload)

    assert exc.value.status_code == 500
    assert exc.value.detail == "alternative document AI failed"