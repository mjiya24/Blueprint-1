from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_complete_step_and_creator_insights_return_live_data():
    response = client.post(
        "/api/paths/path-trade-momentum-7d/complete-step",
        json={
            "step_id": "tm-day-1",
            "user_id": "user_telemetry_01",
            "proof_data": {"type": "trading-rule", "value": "risk_checked"},
        },
    )

    assert response.status_code == 200, response.text
    payload = response.json()
    assert payload["status"] == "success"
    assert payload["path_id"] == "path-trade-momentum-7d"
    assert payload["completed_step_id"] == "tm-day-1"

    insights = client.get("/api/creator/insights")
    assert insights.status_code == 200, insights.text
    body = insights.json()
    assert "active_members" in body
    assert "total_joins" in body
    assert "step_dropoff" in body
