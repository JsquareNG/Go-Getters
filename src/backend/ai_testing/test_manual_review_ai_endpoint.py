from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)


def test_generate_ai_suggestions_endpoint():
    payload = {
        "application_data": {
            "business_country": "SG",
            "businessName": "ABC Pte Ltd"
        },
        "risk_assessment": {
            "risk_score": 10,
            "risk_grade": "LOW",
            "rules_triggered": []
        },
        "documents": [
            {"type": "acra_business_profile"}
        ],
        "action_requests": []
    }

    response = client.post("/manual-review-ai/generate", json=payload)

    assert response.status_code == 200, response.text

    body = response.json()
    assert body["success"] is True
    assert "data" in body
    assert body["data"]["recommended_action"] in {"approve", "reject", "escalate"}