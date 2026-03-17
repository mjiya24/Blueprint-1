"""
Sprint 4 Backend API Tests
Tests: Blueprint carousels, search, daily blueprint, blueprint detail (v2)
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', '').rstrip('/')

TEST_EMAIL = "TEST_sprint4_tester@blueprint.com"
TEST_PASSWORD = "TestPass123"
TEST_NAME = "TEST Sprint4 Tester"


@pytest.fixture(scope="module")
def api_client():
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def auth_user(api_client):
    """Create or login test user, return user data"""
    resp = api_client.post(f"{BASE_URL}/api/auth/signup", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD,
        "name": TEST_NAME
    })
    if resp.status_code == 400:
        resp = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
    assert resp.status_code == 200, f"Auth failed: {resp.text}"
    data = resp.json()
    assert "id" in data
    return data


# ============ BLUEPRINT CAROUSELS TESTS ============

class TestBlueprintCarousels:
    """GET /api/blueprints/carousels - Netflix-style carousels"""

    def test_carousels_returns_200(self, api_client):
        """GET /api/blueprints/carousels returns 200"""
        resp = api_client.get(f"{BASE_URL}/api/blueprints/carousels")
        assert resp.status_code == 200, f"Carousels returned {resp.status_code}: {resp.text}"
        print(f"PASS: Carousels returned 200")

    def test_carousels_returns_8_carousels(self, api_client):
        """Carousels endpoint returns 8 categories"""
        resp = api_client.get(f"{BASE_URL}/api/blueprints/carousels")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list), f"Expected list, got {type(data)}"
        assert len(data) == 8, f"Expected 8 carousels, got {len(data)}. Got: {[c.get('id') for c in data]}"
        print(f"PASS: Got {len(data)} carousels: {[c['id'] for c in data]}")

    def test_carousels_have_correct_ids(self, api_client):
        """Carousels have the expected 8 category IDs"""
        resp = api_client.get(f"{BASE_URL}/api/blueprints/carousels")
        data = resp.json()
        carousel_ids = {c["id"] for c in data}
        expected_ids = {"ai", "high-ticket", "quick-wins", "passive", "agency", "digital", "local", "nocode"}
        assert carousel_ids == expected_ids, f"Carousel IDs mismatch. Expected: {expected_ids}, Got: {carousel_ids}"
        print(f"PASS: All 8 carousel IDs present: {carousel_ids}")

    def test_carousels_have_required_fields(self, api_client):
        """Each carousel has id, title, subtitle, icon, color, blueprints"""
        resp = api_client.get(f"{BASE_URL}/api/blueprints/carousels")
        data = resp.json()
        for carousel in data:
            assert "id" in carousel, f"Carousel missing id: {carousel}"
            assert "title" in carousel, f"Carousel missing title: {carousel.get('id')}"
            assert "subtitle" in carousel, f"Carousel missing subtitle: {carousel.get('id')}"
            assert "icon" in carousel, f"Carousel missing icon: {carousel.get('id')}"
            assert "color" in carousel, f"Carousel missing color: {carousel.get('id')}"
            assert "blueprints" in carousel, f"Carousel missing blueprints: {carousel.get('id')}"
            assert len(carousel["blueprints"]) > 0, f"Carousel {carousel['id']} has no blueprints"
        print(f"PASS: All carousels have required fields")

    def test_carousels_blueprints_have_required_fields(self, api_client):
        """Blueprint cards in carousels have required fields"""
        resp = api_client.get(f"{BASE_URL}/api/blueprints/carousels")
        data = resp.json()
        for carousel in data:
            for bp in carousel["blueprints"]:
                assert "id" in bp, f"Blueprint missing id in carousel {carousel['id']}"
                assert "title" in bp, f"Blueprint missing title in carousel {carousel['id']}"
                assert "category" in bp, f"Blueprint missing category in carousel {carousel['id']}"
                assert "difficulty" in bp, f"Blueprint missing difficulty in carousel {carousel['id']}"
                assert "potential_earnings" in bp, f"Blueprint missing potential_earnings in carousel {carousel['id']}"
        print(f"PASS: All carousel blueprints have required fields")

    def test_carousels_with_user_id_returns_match_scores(self, api_client, auth_user):
        """Carousels with user_id include match_score on blueprints"""
        user_id = auth_user["id"]
        resp = api_client.get(f"{BASE_URL}/api/blueprints/carousels", params={"user_id": user_id})
        assert resp.status_code == 200, f"Carousels with user_id failed: {resp.text}"
        data = resp.json()
        assert len(data) > 0
        # Check first carousel blueprints have match_score
        first_carousel = data[0]
        for bp in first_carousel["blueprints"]:
            assert "match_score" in bp, f"Blueprint {bp.get('id')} missing match_score with user_id"
            assert isinstance(bp["match_score"], int), f"match_score should be int, got {type(bp['match_score'])}"
            assert 30 <= bp["match_score"] <= 99, f"match_score {bp['match_score']} out of range [30,99]"
        print(f"PASS: Carousels with user_id include match_scores")

    def test_carousels_not_conflicting_with_parameterized_route(self, api_client):
        """Route ordering: /blueprints/carousels should NOT be treated as /blueprints/{id}"""
        # If route ordering is wrong, this would return 404 saying "Blueprint not found"
        resp = api_client.get(f"{BASE_URL}/api/blueprints/carousels")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list), "Got non-list response — route may be conflicting with /{id}"
        # Confirm it's not a single blueprint dict
        assert "id" not in data or isinstance(data, list), "Response looks like a single blueprint, not carousels list"
        print(f"PASS: /blueprints/carousels returns list, route ordering correct")


# ============ BLUEPRINT SEARCH TESTS ============

class TestBlueprintSearch:
    """GET /api/blueprints/search - Search and filter blueprints"""

    def test_search_returns_200(self, api_client):
        """GET /api/blueprints/search returns 200"""
        resp = api_client.get(f"{BASE_URL}/api/blueprints/search")
        assert resp.status_code == 200, f"Search returned {resp.status_code}: {resp.text}"
        data = resp.json()
        assert isinstance(data, list)
        print(f"PASS: Search returns {len(data)} results (no query)")

    def test_search_with_query_agency(self, api_client):
        """Search for 'agency' returns relevant results"""
        resp = api_client.get(f"{BASE_URL}/api/blueprints/search", params={"q": "agency"})
        assert resp.status_code == 200, f"Search 'agency' failed: {resp.text}"
        data = resp.json()
        assert isinstance(data, list)
        assert len(data) > 0, "Search for 'agency' returned no results"
        # Verify results contain 'agency' in title or description
        for bp in data:
            has_match = (
                "agency" in bp.get("title", "").lower() or
                "agency" in bp.get("description", "").lower() or
                any("agency" in t.lower() for t in bp.get("tags", []))
            )
            assert has_match, f"Result '{bp.get('title')}' doesn't match 'agency' query"
        print(f"PASS: Search 'agency' returns {len(data)} results")

    def test_search_with_query_ai(self, api_client):
        """Search for 'ai' returns results"""
        resp = api_client.get(f"{BASE_URL}/api/blueprints/search", params={"q": "ai"})
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        assert len(data) > 0, "Search for 'ai' returned no results"
        print(f"PASS: Search 'ai' returns {len(data)} results")

    def test_search_result_has_blueprint_fields(self, api_client):
        """Search results have required blueprint fields"""
        resp = api_client.get(f"{BASE_URL}/api/blueprints/search", params={"q": "agency", "limit": 5})
        data = resp.json()
        assert len(data) > 0
        for bp in data:
            assert "id" in bp, "Blueprint missing id"
            assert "title" in bp, "Blueprint missing title"
            assert "category" in bp, "Blueprint missing category"
            assert "difficulty" in bp, "Blueprint missing difficulty"
            assert "potential_earnings" in bp, "Blueprint missing potential_earnings"
            assert "description" in bp, "Blueprint missing description"
        print(f"PASS: Search results have required fields")

    def test_search_filter_by_category(self, api_client):
        """Search with category filter returns only matching blueprints"""
        resp = api_client.get(f"{BASE_URL}/api/blueprints/search", params={"category": "AI & Automation"})
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) > 0, "AI & Automation category returned no results"
        for bp in data:
            assert bp["category"] == "AI & Automation", f"Category filter failed: got {bp['category']}"
        print(f"PASS: Category filter 'AI & Automation' returns {len(data)} results, all correct category")

    def test_search_filter_by_difficulty(self, api_client):
        """Search with difficulty filter returns only matching blueprints"""
        resp = api_client.get(f"{BASE_URL}/api/blueprints/search", params={"difficulty": "easy"})
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) > 0, "Difficulty 'easy' filter returned no results"
        for bp in data:
            assert bp["difficulty"] == "easy", f"Difficulty filter failed: got {bp['difficulty']}"
        print(f"PASS: Difficulty filter 'easy' returns {len(data)} results")

    def test_search_with_user_id_returns_match_scores(self, api_client, auth_user):
        """Search with user_id includes match_score and sorts by score"""
        user_id = auth_user["id"]
        resp = api_client.get(f"{BASE_URL}/api/blueprints/search", params={"q": "agency", "user_id": user_id})
        assert resp.status_code == 200
        data = resp.json()
        if len(data) > 1:
            for bp in data:
                assert "match_score" in bp, f"Blueprint {bp.get('id')} missing match_score"
            # Should be sorted by match_score descending
            scores = [bp["match_score"] for bp in data]
            assert scores == sorted(scores, reverse=True), f"Results not sorted by match_score: {scores}"
        print(f"PASS: Search with user_id returns match_scores, sorted descending")

    def test_search_no_results_returns_empty_list(self, api_client):
        """Search with non-matching query returns empty list"""
        resp = api_client.get(f"{BASE_URL}/api/blueprints/search", params={"q": "xyzzznonexistent12345"})
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        assert len(data) == 0, f"Expected empty list, got {len(data)} results"
        print(f"PASS: Non-matching search returns empty list")

    def test_search_not_conflicting_with_parameterized_route(self, api_client):
        """Route ordering: /blueprints/search should NOT be treated as /blueprints/{id}"""
        resp = api_client.get(f"{BASE_URL}/api/blueprints/search")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list), "Search returned non-list — possible route conflict with /{id}"
        print(f"PASS: /blueprints/search returns list, route ordering correct")


# ============ DAILY BLUEPRINT TESTS ============

class TestDailyBlueprint:
    """GET /api/blueprints/daily/{user_id} - Daily blueprint for user"""

    def test_daily_blueprint_returns_200(self, api_client, auth_user):
        """GET /api/blueprints/daily/{user_id} returns 200"""
        user_id = auth_user["id"]
        resp = api_client.get(f"{BASE_URL}/api/blueprints/daily/{user_id}")
        assert resp.status_code == 200, f"Daily blueprint failed: {resp.text}"
        print(f"PASS: Daily blueprint returns 200")

    def test_daily_blueprint_has_required_fields(self, api_client, auth_user):
        """Daily blueprint response has all required fields"""
        user_id = auth_user["id"]
        resp = api_client.get(f"{BASE_URL}/api/blueprints/daily/{user_id}")
        assert resp.status_code == 200
        data = resp.json()
        required_fields = ["id", "title", "category", "potential_earnings", "time_to_first_dollar", "match_score"]
        for field in required_fields:
            assert field in data, f"Daily blueprint missing field: {field}"
        print(f"PASS: Daily blueprint has all required fields. Blueprint: {data.get('title')}")

    def test_daily_blueprint_has_valid_match_score(self, api_client, auth_user):
        """Daily blueprint match_score is in valid range"""
        user_id = auth_user["id"]
        resp = api_client.get(f"{BASE_URL}/api/blueprints/daily/{user_id}")
        data = resp.json()
        score = data.get("match_score")
        assert isinstance(score, (int, float)), f"match_score should be numeric, got {type(score)}"
        assert 30 <= score <= 99, f"match_score {score} out of range [30,99]"
        print(f"PASS: Daily blueprint match_score={score} in valid range")

    def test_daily_blueprint_is_v2(self, api_client, auth_user):
        """Daily blueprint should be from v2 blueprints collection"""
        user_id = auth_user["id"]
        resp = api_client.get(f"{BASE_URL}/api/blueprints/daily/{user_id}")
        data = resp.json()
        # v2 blueprints have action_steps with is_locked field or version field
        assert "version" in data or "action_steps" in data, "Daily blueprint missing version or action_steps"
        if "version" in data:
            assert data["version"] == "2.0", f"Expected v2.0 blueprint, got version={data['version']}"
        print(f"PASS: Daily blueprint is v2. Title: {data.get('title')}")

    def test_daily_blueprint_nonexistent_user_returns_404(self, api_client):
        """Daily blueprint for non-existent user returns 404"""
        resp = api_client.get(f"{BASE_URL}/api/blueprints/daily/nonexistent-user-99999")
        assert resp.status_code == 404, f"Expected 404, got {resp.status_code}: {resp.text}"
        print(f"PASS: Nonexistent user daily blueprint returns 404")

    def test_daily_blueprint_not_conflicting_with_parameterized_route(self, api_client, auth_user):
        """Route /blueprints/daily/{user_id} should NOT be caught by /{blueprint_id}"""
        user_id = auth_user["id"]
        resp = api_client.get(f"{BASE_URL}/api/blueprints/daily/{user_id}")
        assert resp.status_code == 200
        data = resp.json()
        # If route was conflicting, it would return 404 "Blueprint not found"
        assert "title" in data, f"Got unexpected response (route conflict?): {data}"
        print(f"PASS: /blueprints/daily/{{user_id}} not conflicting with /${{blueprint_id}}")


# ============ BLUEPRINT DETAIL TESTS ============

class TestBlueprintDetail:
    """GET /api/blueprints/{id} - Blueprint detail page"""

    @pytest.fixture(scope="class")
    def sample_blueprint_id(self, api_client):
        """Get a valid blueprint ID from carousels"""
        resp = api_client.get(f"{BASE_URL}/api/blueprints/carousels")
        assert resp.status_code == 200
        carousels = resp.json()
        assert len(carousels) > 0 and len(carousels[0]["blueprints"]) > 0
        return carousels[0]["blueprints"][0]["id"]

    def test_blueprint_detail_returns_200(self, api_client, sample_blueprint_id):
        """GET /api/blueprints/{id} returns 200"""
        resp = api_client.get(f"{BASE_URL}/api/blueprints/{sample_blueprint_id}")
        assert resp.status_code == 200, f"Blueprint detail failed: {resp.status_code}: {resp.text}"
        print(f"PASS: Blueprint detail returns 200 for id={sample_blueprint_id}")

    def test_blueprint_detail_has_required_fields(self, api_client, sample_blueprint_id):
        """Blueprint detail has all required fields"""
        resp = api_client.get(f"{BASE_URL}/api/blueprints/{sample_blueprint_id}")
        data = resp.json()
        required = ["id", "title", "description", "category", "difficulty",
                    "potential_earnings", "time_to_first_dollar", "action_steps"]
        for field in required:
            assert field in data, f"Blueprint missing field: {field}"
        print(f"PASS: Blueprint '{data.get('title')}' has all required fields")

    def test_blueprint_detail_has_17_steps(self, api_client, sample_blueprint_id):
        """Blueprint detail has 17 action steps"""
        resp = api_client.get(f"{BASE_URL}/api/blueprints/{sample_blueprint_id}")
        data = resp.json()
        steps = data.get("action_steps", [])
        assert len(steps) == 17, f"Expected 17 steps, got {len(steps)}"
        print(f"PASS: Blueprint has {len(steps)} action steps")

    def test_blueprint_steps_have_is_locked_field(self, api_client, sample_blueprint_id):
        """Blueprint action steps have is_locked field for paywall"""
        resp = api_client.get(f"{BASE_URL}/api/blueprints/{sample_blueprint_id}")
        data = resp.json()
        steps = data.get("action_steps", [])
        for step in steps:
            assert "is_locked" in step, f"Step {step.get('step_number')} missing is_locked field"
        print(f"PASS: All steps have is_locked field")

    def test_blueprint_steps_5_free_12_locked(self, api_client, sample_blueprint_id):
        """Blueprint has 5 free steps and 12 locked steps"""
        resp = api_client.get(f"{BASE_URL}/api/blueprints/{sample_blueprint_id}")
        data = resp.json()
        steps = data.get("action_steps", [])
        free_steps = [s for s in steps if not s.get("is_locked")]
        locked_steps = [s for s in steps if s.get("is_locked")]
        assert len(free_steps) == 5, f"Expected 5 free steps, got {len(free_steps)}"
        assert len(locked_steps) == 12, f"Expected 12 locked steps, got {len(locked_steps)}"
        print(f"PASS: {len(free_steps)} free steps, {len(locked_steps)} locked steps")

    def test_blueprint_detail_has_stats(self, api_client, sample_blueprint_id):
        """Blueprint detail has earnings, time, and cost stats"""
        resp = api_client.get(f"{BASE_URL}/api/blueprints/{sample_blueprint_id}")
        data = resp.json()
        assert data.get("potential_earnings"), "Missing potential_earnings"
        assert data.get("time_to_first_dollar"), "Missing time_to_first_dollar"
        # startup_cost or startup_cost_range
        has_cost = "startup_cost_range" in data or "startup_cost" in data
        assert has_cost, "Missing startup cost field"
        print(f"PASS: Blueprint stats - earnings={data.get('potential_earnings')}, time={data.get('time_to_first_dollar')}")

    def test_blueprint_detail_nonexistent_returns_404(self, api_client):
        """Non-existent blueprint returns 404"""
        resp = api_client.get(f"{BASE_URL}/api/blueprints/nonexistent-blueprint-99999")
        assert resp.status_code == 404, f"Expected 404, got {resp.status_code}: {resp.text}"
        print(f"PASS: Non-existent blueprint returns 404")


# ============ ROUTE ORDERING INTEGRATION TEST ============

class TestRouteOrdering:
    """Verify FastAPI route ordering - specific routes before parameterized"""

    def test_carousels_vs_parameterized(self, api_client):
        """'carousels' string should not match /{blueprint_id}"""
        carousels_resp = api_client.get(f"{BASE_URL}/api/blueprints/carousels")
        assert carousels_resp.status_code == 200
        assert isinstance(carousels_resp.json(), list), "Carousels should return list, not single blueprint"
        print("PASS: Route /blueprints/carousels correctly handles specific route before parameterized")

    def test_search_vs_parameterized(self, api_client):
        """'search' string should not match /{blueprint_id}"""
        search_resp = api_client.get(f"{BASE_URL}/api/blueprints/search")
        assert search_resp.status_code == 200
        assert isinstance(search_resp.json(), list), "Search should return list, not single blueprint"
        print("PASS: Route /blueprints/search correctly handles specific route before parameterized")

    def test_daily_vs_parameterized(self, api_client, auth_user):
        """'daily/{user_id}' should not match /{blueprint_id}"""
        user_id = auth_user["id"]
        daily_resp = api_client.get(f"{BASE_URL}/api/blueprints/daily/{user_id}")
        assert daily_resp.status_code in [200, 404], f"Daily returned unexpected status: {daily_resp.status_code}"
        if daily_resp.status_code == 200:
            data = daily_resp.json()
            assert "title" in data, "Daily blueprint should return blueprint data"
        print(f"PASS: Route /blueprints/daily/{{user_id}} correctly handled")

    def test_total_blueprints_count(self, api_client):
        """Verify at least 99 blueprints exist in db"""
        resp = api_client.get(f"{BASE_URL}/api/blueprints", params={"limit": 1})
        assert resp.status_code == 200
        data = resp.json()
        total = data.get("total", 0)
        assert total >= 99, f"Expected at least 99 blueprints, got {total}"
        print(f"PASS: Blueprints collection has {total} items")
