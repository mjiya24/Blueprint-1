from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_activity_feed_fallback_returns_data():
    response = client.get("/api/activity?limit=2")

    assert response.status_code == 200, response.text
    payload = response.json()
    assert "activities" in payload
    assert "total" in payload
    assert len(payload["activities"]) <= 2
    assert payload["activities"][0]["path_title"]
    assert payload["activities"][0]["proof_value"]
