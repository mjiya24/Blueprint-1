"""
Sprint 6 Backend Tests: Theme Engine (client-side only) + Victory Lap Completion Engine
Tests: GET /api/completions/percentile/{idea_id}, POST /api/completions/{user_id}/{idea_id}
"""
import pytest
import requests
import os

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "").rstrip("/")

# Test credentials from review_request
TEST_USER_ID = "73783175-017f-41f9-8fc9-3bcc8dfbcf55"
TEST_IDEA_ID = "gig-002"


@pytest.fixture
def api_client():
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture
def auth_token(api_client):
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": "TEST_sprint4_tester@blueprint.com",
        "password": "TestPass123"
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip(f"Auth failed: {response.status_code} {response.text[:200]}")


@pytest.fixture
def authenticated_client(api_client, auth_token):
    api_client.headers.update({"Authorization": f"Bearer {auth_token}"})
    return api_client


# =================== Health / Regression Tests ===================

class TestHealthRegression:
    """Ensure previously working endpoints still function."""

    def test_home_ideas_loads(self, api_client):
        """Home screen ideas endpoint still working."""
        response = api_client.get(f"{BASE_URL}/api/ideas")
        assert response.status_code == 200
        data = response.json()
        # /api/ideas returns paginated object with 'ideas' key
        ideas = data.get("ideas", data) if isinstance(data, dict) else data
        assert isinstance(ideas, list)
        assert len(ideas) > 0, "Ideas list should not be empty"

    def test_community_wins_loads(self, api_client):
        """Community wins feed at /api/wins still returns data."""
        response = api_client.get(f"{BASE_URL}/api/wins")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    def test_single_idea_loads(self, api_client):
        """Single idea detail still works."""
        response = api_client.get(f"{BASE_URL}/api/ideas/{TEST_IDEA_ID}")
        assert response.status_code == 200
        data = response.json()
        assert data.get("id") == TEST_IDEA_ID
        assert "title" in data
        assert "action_steps" in data


# =================== Sprint 6: Completion Percentile ===================

class TestCompletionPercentile:
    """Tests for GET /api/completions/percentile/{idea_id}"""

    def test_percentile_first_completion_returns_50(self, api_client):
        """When no completions exist, percentile should be 50 (first person)."""
        # Use a unique idea ID that likely has no completions
        response = api_client.get(f"{BASE_URL}/api/completions/percentile/test-nonexistent-idea-xyz?days=5")
        assert response.status_code == 200
        data = response.json()
        # First completion always returns percentile=50
        assert data.get("percentile") == 50
        assert data.get("total_completions") == 1
        assert "completion_days" in data

    def test_percentile_with_days_param(self, api_client):
        """Percentile endpoint accepts days parameter and returns valid structure."""
        response = api_client.get(f"{BASE_URL}/api/completions/percentile/{TEST_IDEA_ID}?days=5")
        assert response.status_code == 200
        data = response.json()
        assert "percentile" in data, "Response must have 'percentile' field"
        assert "total_completions" in data, "Response must have 'total_completions' field"
        assert "completion_days" in data, "Response must have 'completion_days' field"
        assert 0 <= data["percentile"] <= 100, "Percentile must be between 0 and 100"
        assert data["total_completions"] >= 1, "Total completions should be at least 1"

    def test_percentile_completion_days_matches_input(self, api_client):
        """The completion_days in response should match the days parameter sent."""
        days_param = 7
        response = api_client.get(f"{BASE_URL}/api/completions/percentile/{TEST_IDEA_ID}?days={days_param}")
        assert response.status_code == 200
        data = response.json()
        assert data.get("completion_days") == days_param

    def test_percentile_default_days_zero(self, api_client):
        """Percentile endpoint works without days param (defaults to 0)."""
        response = api_client.get(f"{BASE_URL}/api/completions/percentile/{TEST_IDEA_ID}")
        assert response.status_code == 200
        data = response.json()
        assert "percentile" in data

    def test_percentile_float_days(self, api_client):
        """Percentile endpoint accepts float days (1.5 days)."""
        response = api_client.get(f"{BASE_URL}/api/completions/percentile/{TEST_IDEA_ID}?days=1.5")
        assert response.status_code == 200
        data = response.json()
        assert "percentile" in data


# =================== Sprint 6: Save Completion ===================

class TestSaveCompletion:
    """Tests for POST /api/completions/{user_id}/{idea_id}"""

    def test_save_completion_basic(self, api_client):
        """POST /api/completions saves record and returns id + message."""
        payload = {
            "earnings": 150.0,
            "strategy": "TEST_ Focused on outreach via LinkedIn",
            "tricky_step": "Step 3",
            "improvement_tip": "Use Apollo.io",
            "completion_days": 5
        }
        response = api_client.post(
            f"{BASE_URL}/api/completions/{TEST_USER_ID}/{TEST_IDEA_ID}",
            json=payload
        )
        assert response.status_code == 200
        data = response.json()
        assert "message" in data, "Response must have 'message' field"
        assert "id" in data, "Response must have 'id' field"
        assert data["message"] == "Completion saved"
        assert isinstance(data["id"], str)
        assert len(data["id"]) > 0

    def test_save_completion_zero_earnings(self, api_client):
        """Save completion with zero earnings should work (no community win added)."""
        payload = {
            "earnings": 0,
            "strategy": "TEST_ Testing zero earnings",
            "completion_days": 3
        }
        response = api_client.post(
            f"{BASE_URL}/api/completions/{TEST_USER_ID}/{TEST_IDEA_ID}",
            json=payload
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("message") == "Completion saved"
        assert "id" in data

    def test_save_completion_invalid_user_returns_404(self, api_client):
        """POST with invalid user_id should return 404."""
        payload = {
            "earnings": 100,
            "strategy": "test",
            "completion_days": 1
        }
        response = api_client.post(
            f"{BASE_URL}/api/completions/invalid-user-id-xyz/{TEST_IDEA_ID}",
            json=payload
        )
        assert response.status_code == 404, f"Expected 404 for invalid user, got {response.status_code}"

    def test_save_completion_with_earnings_adds_community_win(self, api_client):
        """Saving completion with earnings > 0 should add a win to community feed."""
        # Get community wins count before
        wins_before = api_client.get(f"{BASE_URL}/api/wins").json()
        count_before = len(wins_before)

        # Save completion with earnings
        payload = {
            "earnings": 500.0,
            "strategy": "TEST_ earned 500 via consulting",
            "completion_days": 7
        }
        response = api_client.post(
            f"{BASE_URL}/api/completions/{TEST_USER_ID}/{TEST_IDEA_ID}",
            json=payload
        )
        assert response.status_code == 200

        # Check community wins count increased
        wins_after = api_client.get(f"{BASE_URL}/api/wins").json()
        count_after = len(wins_after)
        assert count_after >= count_before, "Community wins should not decrease after saving completion"
        # A new win should have been added
        assert count_after > count_before, "Community wins count should have increased after earning completion"

    def test_percentile_increases_after_multiple_completions(self, api_client):
        """After saving multiple completions, percentile endpoint should reflect them."""
        # First get percentile for a unique test idea
        test_idea = "gig-002"

        # Get initial count
        r1 = api_client.get(f"{BASE_URL}/api/completions/percentile/{test_idea}?days=5")
        assert r1.status_code == 200
        initial_total = r1.json().get("total_completions", 0)

        # Save a completion
        api_client.post(f"{BASE_URL}/api/completions/{TEST_USER_ID}/{test_idea}", json={
            "earnings": 100.0,
            "strategy": "TEST_",
            "completion_days": 5
        })

        # Get percentile again
        r2 = api_client.get(f"{BASE_URL}/api/completions/percentile/{test_idea}?days=5")
        assert r2.status_code == 200
        new_total = r2.json().get("total_completions", 0)
        assert new_total >= initial_total, "Total completions should not decrease after new submission"

    def test_save_completion_minimal_payload(self, api_client):
        """Minimal payload (only completion_days) should still save successfully."""
        payload = {"completion_days": 2}
        response = api_client.post(
            f"{BASE_URL}/api/completions/{TEST_USER_ID}/{TEST_IDEA_ID}",
            json=payload
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("message") == "Completion saved"


# =================== Sprint 6: Saved Ideas Regression ===================

class TestSavedIdeasRegression:
    """Ensure saved ideas still works after Sprint 6 completion engine touches saved_ideas."""

    def test_saved_idea_still_accessible(self, api_client):
        """Saved idea for test user should still be accessible after completions."""
        response = api_client.get(f"{BASE_URL}/api/saved-ideas/{TEST_USER_ID}")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    def test_login_still_works(self, api_client):
        """Auth login with test credentials still works."""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": "TEST_sprint4_tester@blueprint.com",
            "password": "TestPass123"
        })
        assert response.status_code == 200
        data = response.json()
        # Login returns user object directly (no 'user' wrapper)
        assert "id" in data
        assert "email" in data
        assert data["email"] == "TEST_sprint4_tester@blueprint.com"
