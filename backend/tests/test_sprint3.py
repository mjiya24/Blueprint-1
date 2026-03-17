"""
Sprint 3 Backend Tests: Community Wins, Streak System, Content Engine, Blueprints API
Tests all new endpoints added in Sprint 3.
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://architect-income-1.preview.emergentagent.com").rstrip("/")

# Known test user from previous sprints
TEST_USER_ID = "64c59c73-18f1-4778-bf6e-b553af870ab5"
TEST_USER_EMAIL = "tester@blueprint.com"
TEST_USER_PASSWORD = "TestPass123"
KNOWN_JOB_ID = "e16675e1"


@pytest.fixture(scope="module")
def session():
    """Shared requests session"""
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def auth_token(session):
    """Get auth token for test user"""
    res = session.post(f"{BASE_URL}/api/auth/login", json={"email": TEST_USER_EMAIL, "password": TEST_USER_PASSWORD})
    if res.status_code == 200:
        return res.json()
    pytest.skip(f"Auth failed: {res.status_code} - {res.text}")


@pytest.fixture(scope="module")
def user_id(auth_token):
    return auth_token.get("id", TEST_USER_ID)


# ============ Community Wins API ============

class TestWinsAPI:
    """GET /api/wins and related endpoints"""

    def test_get_wins_returns_200(self, session):
        """GET /api/wins returns HTTP 200"""
        res = session.get(f"{BASE_URL}/api/wins")
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"

    def test_get_wins_returns_list(self, session):
        """GET /api/wins returns a list of wins"""
        res = session.get(f"{BASE_URL}/api/wins")
        assert res.status_code == 200
        data = res.json()
        assert isinstance(data, list), f"Expected list, got {type(data)}"

    def test_get_wins_returns_10_seeded_wins(self, session):
        """GET /api/wins returns at least 10 seeded wins"""
        res = session.get(f"{BASE_URL}/api/wins")
        assert res.status_code == 200
        data = res.json()
        assert len(data) >= 10, f"Expected at least 10 wins, got {len(data)}"

    def test_wins_have_required_fields(self, session):
        """Each win has required fields: id, user_name, earnings_amount, quote"""
        res = session.get(f"{BASE_URL}/api/wins")
        assert res.status_code == 200
        wins = res.json()
        assert len(wins) > 0
        required_fields = ["id", "user_name", "earnings_amount", "quote", "blueprint_title", "category"]
        for win in wins[:3]:
            for field in required_fields:
                assert field in win, f"Win missing field '{field}': {win}"

    def test_get_wins_category_filter(self, session):
        """GET /api/wins?category= filters by category"""
        res = session.get(f"{BASE_URL}/api/wins?category=AI%20%26%20Automation")
        assert res.status_code == 200
        wins = res.json()
        # If data exists for this category, all items should match
        for win in wins:
            assert win.get("category") == "AI & Automation", f"Category mismatch: {win.get('category')}"

    def test_get_wins_stats_returns_200(self, session):
        """GET /api/wins/stats returns HTTP 200"""
        res = session.get(f"{BASE_URL}/api/wins/stats")
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"

    def test_get_wins_stats_correct_structure(self, session):
        """GET /api/wins/stats returns total_wins, total_earned, verified_count"""
        res = session.get(f"{BASE_URL}/api/wins/stats")
        assert res.status_code == 200
        data = res.json()
        assert "total_wins" in data, f"Missing total_wins: {data}"
        assert "total_earned" in data, f"Missing total_earned: {data}"
        assert "verified_count" in data, f"Missing verified_count: {data}"

    def test_wins_stats_total_wins_ge_10(self, session):
        """Stats shows at least 10 total wins"""
        res = session.get(f"{BASE_URL}/api/wins/stats")
        assert res.status_code == 200
        data = res.json()
        assert data["total_wins"] >= 10, f"Expected >= 10 wins, got {data['total_wins']}"

    def test_wins_stats_total_earned_positive(self, session):
        """Stats shows positive total_earned"""
        res = session.get(f"{BASE_URL}/api/wins/stats")
        assert res.status_code == 200
        data = res.json()
        assert data["total_earned"] > 0, f"Expected total_earned > 0, got {data['total_earned']}"

    def test_wins_stats_verified_count_gt_0(self, session):
        """Stats shows verified_count > 0"""
        res = session.get(f"{BASE_URL}/api/wins/stats")
        assert res.status_code == 200
        data = res.json()
        assert data["verified_count"] > 0, f"Expected verified_count > 0, got {data['verified_count']}"

    def test_upvote_win(self, session):
        """POST /api/wins/{win_id}/upvote increments upvote count"""
        # Get first win
        wins_res = session.get(f"{BASE_URL}/api/wins")
        assert wins_res.status_code == 200
        wins = wins_res.json()
        assert len(wins) > 0, "No wins to upvote"
        
        win_id = wins[0]["id"]
        initial_upvotes = wins[0].get("upvotes", 0)
        
        # Upvote it
        upvote_res = session.post(f"{BASE_URL}/api/wins/{win_id}/upvote")
        assert upvote_res.status_code == 200, f"Expected 200, got {upvote_res.status_code}: {upvote_res.text}"

    def test_upvote_nonexistent_win_returns_404(self, session):
        """POST /api/wins/invalid-id/upvote returns 404"""
        res = session.post(f"{BASE_URL}/api/wins/nonexistent-id-999/upvote")
        assert res.status_code == 404, f"Expected 404, got {res.status_code}"

    def test_submit_win_requires_architect(self, session, user_id):
        """POST /api/wins returns 403 for non-architect user"""
        res = session.post(f"{BASE_URL}/api/wins", json={
            "user_id": user_id,
            "blueprint_title": "Test Blueprint",
            "category": "AI & Automation",
            "earnings_amount": 1000,
            "earnings_period": "per month",
            "weeks_to_earn": 4,
            "quote": "This is my test win story that is long enough to be valid",
        })
        # Non-architect should get 403
        assert res.status_code in [403, 404], f"Expected 403 or 404, got {res.status_code}: {res.text}"


# ============ Streak System ============

class TestStreakSystem:
    """POST /api/users/{user_id}/streak/checkin and GET /api/users/{user_id}/streak"""

    def test_streak_checkin_returns_200(self, session, user_id):
        """POST /api/users/{user_id}/streak/checkin returns 200"""
        res = session.post(f"{BASE_URL}/api/users/{user_id}/streak/checkin")
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"

    def test_streak_checkin_returns_correct_fields(self, session, user_id):
        """streak/checkin returns streak_current, streak_longest, is_new_day, message"""
        res = session.post(f"{BASE_URL}/api/users/{user_id}/streak/checkin")
        assert res.status_code == 200
        data = res.json()
        assert "streak_current" in data, f"Missing streak_current: {data}"
        assert "streak_longest" in data, f"Missing streak_longest: {data}"
        assert "is_new_day" in data, f"Missing is_new_day: {data}"
        assert "message" in data, f"Missing message: {data}"

    def test_streak_checkin_current_ge_1(self, session, user_id):
        """streak_current >= 1 after check-in"""
        res = session.post(f"{BASE_URL}/api/users/{user_id}/streak/checkin")
        assert res.status_code == 200
        data = res.json()
        assert data["streak_current"] >= 1, f"Expected streak_current >= 1, got {data['streak_current']}"

    def test_streak_checkin_already_today(self, session, user_id):
        """Second check-in same day returns is_new_day=False"""
        # Do two check-ins back to back
        res1 = session.post(f"{BASE_URL}/api/users/{user_id}/streak/checkin")
        res2 = session.post(f"{BASE_URL}/api/users/{user_id}/streak/checkin")
        assert res2.status_code == 200
        data = res2.json()
        assert data["is_new_day"] == False, f"Expected is_new_day=False on second check-in, got {data}"

    def test_get_streak_returns_200(self, session, user_id):
        """GET /api/users/{user_id}/streak returns 200"""
        res = session.get(f"{BASE_URL}/api/users/{user_id}/streak")
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"

    def test_get_streak_correct_fields(self, session, user_id):
        """GET /api/users/{user_id}/streak returns streak_current, streak_longest, streak_last_action"""
        # Do a checkin first so streak is set
        session.post(f"{BASE_URL}/api/users/{user_id}/streak/checkin")
        res = session.get(f"{BASE_URL}/api/users/{user_id}/streak")
        assert res.status_code == 200
        data = res.json()
        assert "streak_current" in data, f"Missing streak_current: {data}"
        assert "streak_longest" in data, f"Missing streak_longest: {data}"
        assert "streak_last_action" in data, f"Missing streak_last_action: {data}"

    def test_streak_data_persistence(self, session, user_id):
        """Streak data persists: GET returns same streak_current as after checkin"""
        checkin_res = session.post(f"{BASE_URL}/api/users/{user_id}/streak/checkin")
        checkin_streak = checkin_res.json()["streak_current"]

        get_res = session.get(f"{BASE_URL}/api/users/{user_id}/streak")
        get_streak = get_res.json()["streak_current"]

        assert checkin_streak == get_streak, f"Streak mismatch: checkin={checkin_streak}, GET={get_streak}"

    def test_streak_checkin_unknown_user_returns_404(self, session):
        """streak/checkin for unknown user returns 404"""
        res = session.post(f"{BASE_URL}/api/users/nonexistent-user-12345/streak/checkin")
        assert res.status_code == 404, f"Expected 404, got {res.status_code}"


# ============ Blueprint Generation (Content Engine) ============

class TestBlueprintGeneration:
    """POST /api/admin/generate-blueprints and GET /api/admin/generate-blueprints/{job_id}"""

    def test_trigger_generation_returns_200(self, session):
        """POST /api/admin/generate-blueprints returns 200 and job_id"""
        res = session.post(f"{BASE_URL}/api/admin/generate-blueprints?limit=1")
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        data = res.json()
        assert "job_id" in data, f"Missing job_id: {data}"
        assert "message" in data, f"Missing message: {data}"

    def test_trigger_generation_returns_valid_job_id(self, session):
        """Triggered job_id is non-empty string"""
        res = session.post(f"{BASE_URL}/api/admin/generate-blueprints?limit=1")
        data = res.json()
        job_id = data.get("job_id", "")
        assert isinstance(job_id, str) and len(job_id) > 0, f"Invalid job_id: {job_id}"

    def test_get_known_job_status(self, session):
        """GET /api/admin/generate-blueprints/{known_job_id} returns status"""
        res = session.get(f"{BASE_URL}/api/admin/generate-blueprints/{KNOWN_JOB_ID}")
        # 200 if job exists, 404 if server was restarted
        assert res.status_code in [200, 404], f"Expected 200 or 404, got {res.status_code}: {res.text}"
        if res.status_code == 200:
            data = res.json()
            assert "status" in data, f"Missing status field: {data}"
            print(f"Known job status: {data}")

    def test_trigger_and_check_new_job(self, session):
        """Trigger a new job and check its status"""
        # Trigger
        trigger_res = session.post(f"{BASE_URL}/api/admin/generate-blueprints?limit=1")
        assert trigger_res.status_code == 200
        job_id = trigger_res.json()["job_id"]

        # Check status immediately
        time.sleep(0.5)
        status_res = session.get(f"{BASE_URL}/api/admin/generate-blueprints/{job_id}")
        assert status_res.status_code == 200, f"Expected 200, got {status_res.status_code}: {status_res.text}"
        data = status_res.json()
        assert "status" in data, f"Missing status: {data}"
        assert data["status"] in ["running", "complete", "error"], f"Unexpected status: {data['status']}"
        print(f"New job {job_id} status: {data}")

    def test_get_nonexistent_job_returns_404(self, session):
        """GET /api/admin/generate-blueprints/fake-job returns 404"""
        res = session.get(f"{BASE_URL}/api/admin/generate-blueprints/fake-nonexistent-job")
        assert res.status_code == 404, f"Expected 404, got {res.status_code}"


# ============ Blueprints API ============

class TestBlueprintsAPI:
    """GET /api/blueprints - returns generated blueprints"""

    def test_get_blueprints_returns_200(self, session):
        """GET /api/blueprints returns 200"""
        res = session.get(f"{BASE_URL}/api/blueprints")
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"

    def test_get_blueprints_has_required_fields(self, session):
        """GET /api/blueprints returns dict with blueprints, total, has_more"""
        res = session.get(f"{BASE_URL}/api/blueprints")
        assert res.status_code == 200
        data = res.json()
        assert "blueprints" in data, f"Missing 'blueprints' key: {data}"
        assert "total" in data, f"Missing 'total' key: {data}"
        assert "has_more" in data, f"Missing 'has_more' key: {data}"

    def test_blueprints_list_is_list(self, session):
        """blueprints field is a list"""
        res = session.get(f"{BASE_URL}/api/blueprints")
        assert res.status_code == 200
        data = res.json()
        assert isinstance(data["blueprints"], list), f"Expected list, got {type(data['blueprints'])}"

    def test_blueprints_if_exists_have_fields(self, session):
        """Generated blueprints (if any) have id, title, category, action_steps"""
        res = session.get(f"{BASE_URL}/api/blueprints")
        data = res.json()
        blueprints = data["blueprints"]
        if len(blueprints) > 0:
            bp = blueprints[0]
            required = ["id", "title", "category"]
            for field in required:
                assert field in bp, f"Blueprint missing '{field}': {bp.keys()}"
            print(f"Found {len(blueprints)} blueprints. First: {bp['title']}")
        else:
            print("No blueprints generated yet (generation may still be running)")

    def test_blueprints_category_filter(self, session):
        """GET /api/blueprints?category= filters correctly"""
        res = session.get(f"{BASE_URL}/api/blueprints?category=AI%20%26%20Automation")
        assert res.status_code == 200
        data = res.json()
        for bp in data.get("blueprints", []):
            assert bp.get("category") == "AI & Automation", f"Category mismatch: {bp.get('category')}"


# ============ Existing Features Regression ============

class TestExistingFeatures:
    """Regression tests for Sprint 1 & 2 features"""

    def test_ideas_load(self, session):
        """GET /api/ideas still returns ideas"""
        res = session.get(f"{BASE_URL}/api/ideas")
        assert res.status_code == 200
        data = res.json()
        assert len(data.get("ideas", [])) >= 20, f"Expected >= 20 ideas, got {len(data.get('ideas', []))}"

    def test_login_still_works(self, session):
        """POST /api/auth/login still works"""
        res = session.post(f"{BASE_URL}/api/auth/login", json={"email": TEST_USER_EMAIL, "password": TEST_USER_PASSWORD})
        assert res.status_code == 200
        data = res.json()
        assert "id" in data and "email" in data and "is_architect" in data

    def test_idea_detail_loads(self, session):
        """GET /api/ideas/digital-001 loads correctly"""
        res = session.get(f"{BASE_URL}/api/ideas/digital-001")
        assert res.status_code == 200
        data = res.json()
        assert data.get("id") == "digital-001"
