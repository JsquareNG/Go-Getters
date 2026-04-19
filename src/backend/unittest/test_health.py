from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

def test_root_or_health():
    response = client.get("/")
    assert response.status_code in [200, 404]