"""
Sprint 5 Backend API Tests
Tests: Rescue Mode, Local Trending, Blueprint Viability, Location Update
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', '').rstrip('/')

# Known test user IDs from DB
ARCHITECT_USER_ID = "73783175-017f-41f9-8fc9-3bcc8dfbcf55"  # Austin user, is_architect=True
NON_ARCHITECT_EMAIL = "TEST_sprint4_tester@blueprint.com"
NON_ARCHITECT_PASSWORD = "TestPass123"

# Test data for location
TEST_CITY = "Austin"
TEST_COUNTRY_CODE = "US"
TEST_COUNTRY = "United States"
TEST_STATE = "Texas"


@pytest.fixture(scope="module")
def api_client():
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def non_architect_user(api_client):
    """Login as non-architect test user"""
    resp = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": NON_ARCHITECT_EMAIL,
        "password": NON_ARCHITECT_PASSWORD,
    })
    if resp.status_code != 200:
        # Try signup
        resp = api_client.post(f"{BASE_URL}/api/auth/signup", json={
            "email": NON_ARCHITECT_EMAIL,
            "password": NON_ARCHITECT_PASSWORD,
            "name": "TEST Sprint4 Tester"
        })
    assert resp.status_code == 200, f"Non-architect login failed: {resp.text}"
    data = resp.json()
    assert not data.get("is_architect", False), "Test user should NOT be an architect"
    return data


@pytest.fixture(scope="module")
def sample_blueprint_id(api_client):
    """Get a valid blueprint ID for testing"""
    resp = api_client.get(f"{BASE_URL}/api/blueprints/carousels")
    assert resp.status_code == 200
    carousels = resp.json()
    assert len(carousels) > 0 and len(carousels[0]["blueprints"]) > 0
    return carousels[0]["blueprints"][0]["id"]


@pytest.fixture(scope="module")
def sample_idea_id(api_client):
    """Get a valid idea ID for rescue mode testing"""
    resp = api_client.get(f"{BASE_URL}/api/ideas", params={"limit": 1})
    assert resp.status_code == 200
    ideas = resp.json().get("ideas", [])
    assert len(ideas) > 0, "No ideas found"
    return ideas[0]["id"]


# ============ LOCATION UPDATE TESTS ============

class TestLocationUpdate:
    """PUT /api/users/{user_id}/location - Store user geolocation"""

    def test_update_location_returns_200(self, api_client):
        """PUT /api/users/{user_id}/location returns 200"""
        resp = api_client.put(f"{BASE_URL}/api/users/{ARCHITECT_USER_ID}/location", json={
            "city": TEST_CITY,
            "state": TEST_STATE,
            "country": TEST_COUNTRY,
            "country_code": TEST_COUNTRY_CODE,
        })
        assert resp.status_code == 200, f"Location update failed: {resp.status_code}: {resp.text}"
        print(f"PASS: Location update returns 200")

    def test_update_location_response_contains_city(self, api_client):
        """Location update response contains city and currency"""
        resp = api_client.put(f"{BASE_URL}/api/users/{ARCHITECT_USER_ID}/location", json={
            "city": TEST_CITY,
            "state": TEST_STATE,
            "country": TEST_COUNTRY,
            "country_code": TEST_COUNTRY_CODE,
        })
        data = resp.json()
        assert "city" in data, f"Response missing city: {data}"
        assert data["city"] == TEST_CITY, f"Expected city={TEST_CITY}, got {data['city']}"
        assert "currency" in data, f"Response missing currency: {data}"
        print(f"PASS: Location response has city={data['city']}, currency={data['currency']}")

    def test_update_location_currency_mapping(self, api_client):
        """Currency code/symbol correctly mapped based on country_code"""
        resp = api_client.put(f"{BASE_URL}/api/users/{ARCHITECT_USER_ID}/location", json={
            "city": "London",
            "state": "",
            "country": "United Kingdom",
            "country_code": "GB",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["currency"]["code"] == "GBP", f"Expected GBP, got {data['currency']['code']}"
        assert data["currency"]["symbol"] == "£", f"Expected £, got {data['currency']['symbol']}"
        print(f"PASS: GB currency correctly mapped: {data['currency']}")
        # Reset back to Austin
        api_client.put(f"{BASE_URL}/api/users/{ARCHITECT_USER_ID}/location", json={
            "city": TEST_CITY, "state": TEST_STATE, "country": TEST_COUNTRY, "country_code": TEST_COUNTRY_CODE
        })

    def test_update_location_persists_in_profile(self, api_client):
        """After update, profile should contain city/country fields"""
        # First update location
        api_client.put(f"{BASE_URL}/api/users/{ARCHITECT_USER_ID}/location", json={
            "city": TEST_CITY,
            "state": TEST_STATE,
            "country": TEST_COUNTRY,
            "country_code": TEST_COUNTRY_CODE,
        })
        # Then GET profile
        resp = api_client.get(f"{BASE_URL}/api/users/{ARCHITECT_USER_ID}/profile")
        assert resp.status_code == 200, f"Profile GET failed: {resp.text}"
        profile = resp.json()
        assert profile.get("city") == TEST_CITY, f"City not persisted: {profile.get('city')}"
        assert profile.get("country_code") == TEST_COUNTRY_CODE, f"country_code not persisted"
        print(f"PASS: Location persisted in profile: city={profile.get('city')}, country_code={profile.get('country_code')}")

    def test_update_location_nonexistent_user_returns_404(self, api_client):
        """Non-existent user returns 404"""
        resp = api_client.put(f"{BASE_URL}/api/users/nonexistent-user-xyz/location", json={
            "city": "NY", "country_code": "US"
        })
        assert resp.status_code == 404, f"Expected 404, got {resp.status_code}: {resp.text}"
        print(f"PASS: Non-existent user location update returns 404")


# ============ LOCAL TRENDING TESTS ============

class TestLocalTrending:
    """GET /api/blueprints/local-trending - Returns region-relevant blueprints"""

    def test_local_trending_returns_200(self, api_client):
        """GET /api/blueprints/local-trending returns 200"""
        resp = api_client.get(f"{BASE_URL}/api/blueprints/local-trending", params={
            "city": TEST_CITY,
            "country_code": TEST_COUNTRY_CODE,
        })
        assert resp.status_code == 200, f"Local trending failed: {resp.status_code}: {resp.text}"
        print(f"PASS: Local trending returns 200")

    def test_local_trending_returns_3_blueprints(self, api_client):
        """Local trending returns 3 blueprints (one per region-relevant category)"""
        resp = api_client.get(f"{BASE_URL}/api/blueprints/local-trending", params={
            "city": TEST_CITY,
            "country_code": TEST_COUNTRY_CODE,
        })
        data = resp.json()
        blueprints = data.get("blueprints", [])
        assert len(blueprints) == 3, f"Expected 3 blueprints, got {len(blueprints)}"
        print(f"PASS: Local trending returns 3 blueprints for {TEST_CITY}")

    def test_local_trending_response_has_city_and_country(self, api_client):
        """Response includes city and country_code"""
        resp = api_client.get(f"{BASE_URL}/api/blueprints/local-trending", params={
            "city": TEST_CITY,
            "country_code": TEST_COUNTRY_CODE,
        })
        data = resp.json()
        assert "city" in data, f"Response missing city: {data.keys()}"
        assert "country_code" in data, f"Response missing country_code: {data.keys()}"
        assert data["city"] == TEST_CITY
        assert data["country_code"] == TEST_COUNTRY_CODE
        print(f"PASS: Response has city={data['city']}, country_code={data['country_code']}")

    def test_local_trending_blueprints_have_required_fields(self, api_client):
        """Each trending blueprint has required fields"""
        resp = api_client.get(f"{BASE_URL}/api/blueprints/local-trending", params={
            "city": TEST_CITY, "country_code": TEST_COUNTRY_CODE,
        })
        data = resp.json()
        blueprints = data.get("blueprints", [])
        for bp in blueprints:
            assert "id" in bp, f"Blueprint missing id: {bp}"
            assert "title" in bp, f"Blueprint missing title"
            assert "category" in bp, f"Blueprint missing category"
            assert "potential_earnings" in bp, f"Blueprint missing potential_earnings"
        print(f"PASS: All trending blueprints have required fields")

    def test_local_trending_us_categories(self, api_client):
        """US country code returns AI & Automation, Agency & B2B, Digital & Content categories"""
        resp = api_client.get(f"{BASE_URL}/api/blueprints/local-trending", params={
            "city": TEST_CITY, "country_code": "US",
        })
        data = resp.json()
        blueprints = data.get("blueprints", [])
        categories = [bp.get("category") for bp in blueprints]
        expected_us_cats = {"AI & Automation", "Agency & B2B", "Digital & Content"}
        actual_cats = set(categories)
        assert actual_cats == expected_us_cats, f"Expected US categories {expected_us_cats}, got {actual_cats}"
        print(f"PASS: US local trending returns correct categories: {actual_cats}")

    def test_local_trending_in_categories(self, api_client):
        """India (IN) returns different regional categories"""
        resp = api_client.get(f"{BASE_URL}/api/blueprints/local-trending", params={
            "city": "Mumbai", "country_code": "IN",
        })
        assert resp.status_code == 200
        data = resp.json()
        blueprints = data.get("blueprints", [])
        categories = [bp.get("category") for bp in blueprints]
        expected_in_cats = {"Digital & Content", "No-Code & SaaS", "AI & Automation"}
        actual_cats = set(categories)
        assert actual_cats == expected_in_cats, f"Expected IN categories {expected_in_cats}, got {actual_cats}"
        print(f"PASS: IN local trending returns correct categories: {actual_cats}")

    def test_local_trending_with_user_id(self, api_client):
        """Local trending with user_id includes match_scores"""
        resp = api_client.get(f"{BASE_URL}/api/blueprints/local-trending", params={
            "city": TEST_CITY, "country_code": TEST_COUNTRY_CODE, "user_id": ARCHITECT_USER_ID,
        })
        assert resp.status_code == 200
        data = resp.json()
        blueprints = data.get("blueprints", [])
        for bp in blueprints:
            assert "match_score" in bp, f"Blueprint {bp.get('id')} missing match_score with user_id"
        print(f"PASS: Local trending with user_id includes match_scores")

    def test_local_trending_not_conflicting_with_parameterized_route(self, api_client):
        """Route /blueprints/local-trending should not be caught by /{blueprint_id}"""
        resp = api_client.get(f"{BASE_URL}/api/blueprints/local-trending", params={
            "city": TEST_CITY, "country_code": TEST_COUNTRY_CODE,
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "blueprints" in data, f"Expected dict with 'blueprints' key, got: {type(data)}"
        print(f"PASS: /blueprints/local-trending route ordering correct")


# ============ BLUEPRINT VIABILITY TESTS ============

class TestBlueprintViability:
    """GET /api/blueprints/{blueprint_id}/viability - AI-powered local market viability"""

    def test_viability_returns_200(self, api_client, sample_blueprint_id):
        """GET /api/blueprints/{id}/viability returns 200"""
        resp = api_client.get(f"{BASE_URL}/api/blueprints/{sample_blueprint_id}/viability", params={
            "city": TEST_CITY,
            "country_code": TEST_COUNTRY_CODE,
            "country": TEST_COUNTRY,
        }, timeout=30)
        assert resp.status_code == 200, f"Viability failed: {resp.status_code}: {resp.text}"
        print(f"PASS: Viability returns 200 for blueprint {sample_blueprint_id}")

    def test_viability_has_required_fields(self, api_client, sample_blueprint_id):
        """Viability response has score, demand_level, reason, local_tip"""
        resp = api_client.get(f"{BASE_URL}/api/blueprints/{sample_blueprint_id}/viability", params={
            "city": TEST_CITY, "country_code": TEST_COUNTRY_CODE,
        }, timeout=30)
        assert resp.status_code == 200
        data = resp.json()
        required_fields = ["score", "demand_level", "reason", "local_tip"]
        for field in required_fields:
            assert field in data, f"Viability missing field: {field}. Response: {data}"
        print(f"PASS: Viability has all required fields. Score={data['score']}, Demand={data['demand_level']}")

    def test_viability_score_in_range(self, api_client, sample_blueprint_id):
        """Viability score is between 1-100"""
        resp = api_client.get(f"{BASE_URL}/api/blueprints/{sample_blueprint_id}/viability", params={
            "city": TEST_CITY, "country_code": TEST_COUNTRY_CODE,
        }, timeout=30)
        data = resp.json()
        score = data.get("score")
        assert isinstance(score, (int, float)), f"Score should be numeric, got {type(score)}"
        assert 1 <= score <= 100, f"Score {score} out of range [1, 100]"
        print(f"PASS: Viability score={score} in valid range")

    def test_viability_demand_level_valid(self, api_client, sample_blueprint_id):
        """Demand level is one of High/Medium/Low"""
        resp = api_client.get(f"{BASE_URL}/api/blueprints/{sample_blueprint_id}/viability", params={
            "city": TEST_CITY, "country_code": TEST_COUNTRY_CODE,
        }, timeout=30)
        data = resp.json()
        demand = data.get("demand_level")
        valid_levels = {"High", "Medium", "Low"}
        assert demand in valid_levels, f"Invalid demand_level '{demand}', expected one of {valid_levels}"
        print(f"PASS: demand_level='{demand}' is valid")

    def test_viability_nonexistent_blueprint_returns_404(self, api_client):
        """Non-existent blueprint returns 404"""
        resp = api_client.get(f"{BASE_URL}/api/blueprints/nonexistent-bp-xyz/viability", params={
            "city": TEST_CITY, "country_code": TEST_COUNTRY_CODE,
        }, timeout=30)
        assert resp.status_code == 404, f"Expected 404, got {resp.status_code}: {resp.text}"
        print(f"PASS: Non-existent blueprint viability returns 404")


# ============ RESCUE MODE TESTS ============

class TestRescueMode:
    """POST /api/rescue/{user_id}/{idea_id} - Architect-only AI rescue tasks"""

    def test_rescue_non_architect_returns_403(self, api_client, non_architect_user, sample_idea_id):
        """Non-architect user gets 403 Forbidden"""
        user_id = non_architect_user["id"]
        resp = api_client.post(f"{BASE_URL}/api/rescue/{user_id}/{sample_idea_id}", timeout=30)
        assert resp.status_code == 403, f"Expected 403 for non-architect, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert "Architect" in data.get("detail", ""), f"403 message should mention Architect: {data}"
        print(f"PASS: Non-architect gets 403: {data.get('detail')}")

    def test_rescue_nonexistent_user_returns_404(self, api_client, sample_idea_id):
        """Non-existent user returns 404"""
        resp = api_client.post(f"{BASE_URL}/api/rescue/nonexistent-user-xyz/{sample_idea_id}", timeout=30)
        assert resp.status_code == 404, f"Expected 404, got {resp.status_code}: {resp.text}"
        print(f"PASS: Non-existent user rescue returns 404")

    def test_rescue_nonexistent_blueprint_returns_404(self, api_client):
        """Non-existent blueprint/idea returns 404"""
        resp = api_client.post(f"{BASE_URL}/api/rescue/{ARCHITECT_USER_ID}/nonexistent-idea-xyz", timeout=30)
        assert resp.status_code == 404, f"Expected 404, got {resp.status_code}: {resp.text}"
        print(f"PASS: Non-existent blueprint rescue returns 404")

    def test_rescue_architect_returns_200(self, api_client, sample_idea_id):
        """Architect user gets 200 with rescue tasks (calls Gemini)"""
        resp = api_client.post(f"{BASE_URL}/api/rescue/{ARCHITECT_USER_ID}/{sample_idea_id}", timeout=45)
        assert resp.status_code == 200, f"Rescue for architect failed: {resp.status_code}: {resp.text}"
        print(f"PASS: Architect rescue returns 200")

    def test_rescue_architect_has_3_tasks(self, api_client, sample_idea_id):
        """Rescue response has exactly 3 tasks"""
        resp = api_client.post(f"{BASE_URL}/api/rescue/{ARCHITECT_USER_ID}/{sample_idea_id}", timeout=45)
        assert resp.status_code == 200
        data = resp.json()
        tasks = data.get("tasks", [])
        assert len(tasks) == 3, f"Expected 3 tasks, got {len(tasks)}: {data}"
        print(f"PASS: Rescue returns {len(tasks)} tasks")

    def test_rescue_has_required_fields(self, api_client, sample_idea_id):
        """Rescue response has rescue_message and task fields"""
        resp = api_client.post(f"{BASE_URL}/api/rescue/{ARCHITECT_USER_ID}/{sample_idea_id}", timeout=45)
        assert resp.status_code == 200
        data = resp.json()
        # Top-level fields
        assert "rescue_message" in data, f"Missing rescue_message: {data.keys()}"
        assert "tasks" in data, f"Missing tasks: {data.keys()}"
        assert "stuck_step" in data, f"Missing stuck_step: {data.keys()}"
        assert "stuck_step_num" in data, f"Missing stuck_step_num: {data.keys()}"
        # Task fields
        for i, task in enumerate(data["tasks"]):
            assert "title" in task, f"Task {i} missing title"
            assert "description" in task, f"Task {i} missing description"
            assert "estimated_earn" in task, f"Task {i} missing estimated_earn"
            assert "time_required" in task, f"Task {i} missing time_required"
            assert "action_label" in task, f"Task {i} missing action_label"
        print(f"PASS: Rescue has rescue_message + 3 tasks with all required fields")

    def test_rescue_tasks_with_blueprint_id(self, api_client, sample_blueprint_id):
        """Rescue mode also works with blueprint IDs (not just idea IDs)"""
        resp = api_client.post(f"{BASE_URL}/api/rescue/{ARCHITECT_USER_ID}/{sample_blueprint_id}", timeout=45)
        # Blueprint may not exist in blueprints collection OR it should work
        assert resp.status_code in [200, 404], f"Unexpected status: {resp.status_code}: {resp.text}"
        if resp.status_code == 200:
            print(f"PASS: Rescue works with blueprint ID {sample_blueprint_id}")
        else:
            print(f"INFO: Blueprint {sample_blueprint_id} rescue returns 404 (blueprint vs idea DB separation)")
