"""
Sprint 7A - ARC Credits System Tests
Tests: GET /api/arc/{user_id}, POST /api/arc/award
Covers: step_complete, blueprint_complete, share_flex, daily_login events
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://quick-wins-3.preview.emergentagent.com')

# --- Shared test user state ---
# We create one fresh test user per test run for sequential ARC award tests
TEST_EMAIL = f"TEST_arc7_{uuid.uuid4().hex[:6]}@blueprint.com"
TEST_PASSWORD = "TestPass123"
TEST_NAME = "ARC Sprint7 Tester"

# Known test user with 0 ARC
ARCTEST_EMAIL = "arctest2@blueprint.com"
ARCTEST_PASSWORD = "Test123!"

# Shared state dict filled by setup
shared = {"user_id": None, "arctest_user_id": None}


@pytest.fixture(scope="module")
def create_test_user():
    """Create a fresh test user and return user_id"""
    res = requests.post(f"{BASE_URL}/api/auth/signup", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD,
        "name": TEST_NAME
    })
    if res.status_code not in [200, 201]:
        pytest.skip(f"Could not create test user: {res.text}")
    user_id = res.json().get("id")
    shared["user_id"] = user_id
    return user_id


@pytest.fixture(scope="module")
def arctest_user_id():
    """Login as arctest2@blueprint.com and return user_id"""
    res = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ARCTEST_EMAIL,
        "password": ARCTEST_PASSWORD
    })
    if res.status_code != 200:
        pytest.skip(f"Cannot login as arctest2: {res.text}")
    uid = res.json().get("id")
    shared["arctest_user_id"] = uid
    return uid


class TestARCGetBalance:
    """Test GET /api/arc/{user_id} endpoint"""

    def test_get_arc_balance_new_user_returns_zero(self, create_test_user):
        """New user should have 0 ARC, Apprentice level, next_milestone=100"""
        user_id = create_test_user
        res = requests.get(f"{BASE_URL}/api/arc/{user_id}")
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"

        data = res.json()
        # Field is arc_balance (not balance)
        assert "arc_balance" in data, f"arc_balance field missing: {data}"
        assert data["arc_balance"] == 0, f"Expected 0 ARC for new user, got {data['arc_balance']}"
        assert "level" in data, f"level field missing: {data}"
        assert data["level"] == "Apprentice", f"Expected Apprentice level, got {data['level']}"
        assert "next_milestone" in data, f"next_milestone field missing: {data}"
        assert data["next_milestone"] == 100, f"Expected next_milestone=100, got {data['next_milestone']}"
        print(f"PASS: New user ARC balance: {data}")

    def test_get_arc_balance_arctest_user(self, arctest_user_id):
        """arctest2@blueprint.com should have Apprentice level"""
        res = requests.get(f"{BASE_URL}/api/arc/{arctest_user_id}")
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"

        data = res.json()
        assert "arc_balance" in data, f"arc_balance field missing: {data}"
        assert data["level"] == "Apprentice", f"Expected Apprentice level, got {data['level']}"
        print(f"PASS: arctest2 ARC balance: {data}")

    def test_get_arc_balance_unknown_user_returns_404(self):
        """Non-existent user should return 404"""
        fake_id = str(uuid.uuid4())
        res = requests.get(f"{BASE_URL}/api/arc/{fake_id}")
        assert res.status_code == 404, f"Expected 404, got {res.status_code}: {res.text}"
        print(f"PASS: Unknown user returns 404")


class TestARCAwardEvents:
    """Test POST /api/arc/award - sequential ARC accumulation"""

    def test_award_step_complete_10_arc(self, create_test_user):
        """step_complete should award 10 ARC to new user → new_balance=10, level=Apprentice"""
        user_id = create_test_user
        res = requests.post(f"{BASE_URL}/api/arc/award", json={
            "user_id": user_id,
            "event": "step_complete"
        })
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"

        data = res.json()
        assert "awarded" in data, f"awarded field missing: {data}"
        assert data["awarded"] == 10, f"Expected 10 ARC awarded, got {data['awarded']}"
        assert "new_balance" in data, f"new_balance field missing: {data}"
        assert data["new_balance"] == 10, f"Expected new_balance=10, got {data['new_balance']}"
        assert data["level"] == "Apprentice", f"Expected Apprentice, got {data['level']}"
        assert data["event"] == "step_complete", f"event field mismatch: {data}"
        print(f"PASS: step_complete awarded: {data}")

    def test_award_blueprint_complete_100_arc(self, create_test_user):
        """blueprint_complete should award 100 ARC → cumulative new_balance=110, level=Builder"""
        user_id = create_test_user
        res = requests.post(f"{BASE_URL}/api/arc/award", json={
            "user_id": user_id,
            "event": "blueprint_complete"
        })
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"

        data = res.json()
        assert data["awarded"] == 100, f"Expected 100 ARC awarded, got {data['awarded']}"
        assert data["new_balance"] == 110, f"Expected new_balance=110 (10+100), got {data['new_balance']}"
        assert data["level"] == "Builder", f"Expected Builder level at 110 ARC, got {data['level']}"
        assert data["event"] == "blueprint_complete", f"event mismatch: {data}"
        print(f"PASS: blueprint_complete awarded: {data}")

    def test_award_share_flex_25_arc(self, create_test_user):
        """share_flex should award 25 ARC → cumulative new_balance=135"""
        user_id = create_test_user
        res = requests.post(f"{BASE_URL}/api/arc/award", json={
            "user_id": user_id,
            "event": "share_flex"
        })
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"

        data = res.json()
        assert data["awarded"] == 25, f"Expected 25 ARC awarded, got {data['awarded']}"
        assert data["new_balance"] == 135, f"Expected new_balance=135 (110+25), got {data['new_balance']}"
        assert data["level"] == "Builder", f"Expected Builder level at 135 ARC, got {data['level']}"
        print(f"PASS: share_flex awarded: {data}")

    def test_award_daily_login_5_arc(self, create_test_user):
        """daily_login should award 5 ARC → cumulative new_balance=140"""
        user_id = create_test_user
        res = requests.post(f"{BASE_URL}/api/arc/award", json={
            "user_id": user_id,
            "event": "daily_login"
        })
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"

        data = res.json()
        assert data["awarded"] == 5, f"Expected 5 ARC awarded, got {data['awarded']}"
        assert data["new_balance"] == 140, f"Expected new_balance=140 (135+5), got {data['new_balance']}"
        print(f"PASS: daily_login awarded: {data}")

    def test_award_unknown_event_returns_400(self, create_test_user):
        """Unknown event should return 400"""
        user_id = create_test_user
        res = requests.post(f"{BASE_URL}/api/arc/award", json={
            "user_id": user_id,
            "event": "invalid_event"
        })
        assert res.status_code == 400, f"Expected 400, got {res.status_code}: {res.text}"
        print(f"PASS: Unknown event returns 400")

    def test_award_arc_unknown_user_returns_404(self):
        """Award ARC to non-existent user should return 404"""
        fake_id = str(uuid.uuid4())
        res = requests.post(f"{BASE_URL}/api/arc/award", json={
            "user_id": fake_id,
            "event": "step_complete"
        })
        assert res.status_code == 404, f"Expected 404, got {res.status_code}: {res.text}"
        print(f"PASS: Unknown user returns 404")

    def test_get_balance_after_awards_persisted(self, create_test_user):
        """Verify ARC awards persisted in DB via GET (balance should be 140)"""
        user_id = create_test_user
        res = requests.get(f"{BASE_URL}/api/arc/{user_id}")
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"

        data = res.json()
        assert data["arc_balance"] == 140, f"Expected persisted balance=140, got {data['arc_balance']}"
        assert data["level"] == "Builder", f"Expected Builder, got {data['level']}"
        assert data["next_milestone"] == 300, f"Expected next_milestone=300 at Builder level, got {data['next_milestone']}"
        print(f"PASS: ARC balance persisted correctly: {data}")


class TestARCLevelThresholds:
    """Test level progression through correct thresholds"""

    def test_level_builder_threshold_100_arc(self):
        """At exactly 100 ARC → level should be Builder"""
        # Create fresh user
        email = f"TEST_arcthresh_{uuid.uuid4().hex[:6]}@blueprint.com"
        signup = requests.post(f"{BASE_URL}/api/auth/signup", json={
            "email": email, "password": "TestPass123", "name": "ARC Level Test"
        })
        if signup.status_code not in [200, 201]:
            pytest.skip("Could not create threshold test user")
        user_id = signup.json()["id"]

        # Award exactly 100 ARC via blueprint_complete
        res = requests.post(f"{BASE_URL}/api/arc/award", json={
            "user_id": user_id, "event": "blueprint_complete"
        })
        data = res.json()
        assert data["new_balance"] == 100, f"Expected 100, got {data['new_balance']}"
        assert data["level"] == "Builder", f"Expected Builder at 100 ARC, got {data['level']}"
        print(f"PASS: Builder threshold at 100 ARC: {data}")

    def test_level_strategist_threshold_300_arc(self):
        """Verify Strategist level at >= 300 ARC"""
        # Test via logic: balance=300 → Strategist
        # Award enough via API to hit 300 ARC threshold
        email = f"TEST_arcstrat_{uuid.uuid4().hex[:6]}@blueprint.com"
        signup = requests.post(f"{BASE_URL}/api/auth/signup", json={
            "email": email, "password": "TestPass123", "name": "ARC Strategist Test"
        })
        if signup.status_code not in [200, 201]:
            pytest.skip("Could not create strategist test user")
        user_id = signup.json()["id"]

        # Award 3 x blueprint_complete = 300 ARC
        for _ in range(3):
            requests.post(f"{BASE_URL}/api/arc/award", json={
                "user_id": user_id, "event": "blueprint_complete"
            })

        res = requests.get(f"{BASE_URL}/api/arc/{user_id}")
        data = res.json()
        assert data["arc_balance"] == 300, f"Expected 300, got {data['arc_balance']}"
        assert data["level"] == "Strategist", f"Expected Strategist at 300 ARC, got {data['level']}"
        print(f"PASS: Strategist at 300 ARC: {data}")


class TestARCRegressionAPIs:
    """Regression tests - verify core APIs still work after Sprint 7"""

    def test_get_ideas_returns_data(self):
        """GET /api/ideas should return ideas list"""
        res = requests.get(f"{BASE_URL}/api/ideas")
        assert res.status_code == 200, f"Expected 200, got {res.status_code}"
        data = res.json()
        assert "ideas" in data
        assert len(data["ideas"]) > 0
        print(f"PASS: /api/ideas returns {data['total']} ideas")

    def test_auth_login_arctest_user(self):
        """Login with arctest2@blueprint.com should succeed"""
        res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ARCTEST_EMAIL,
            "password": ARCTEST_PASSWORD
        })
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        data = res.json()
        assert "id" in data, f"id missing from login response: {data}"
        assert data["email"] == ARCTEST_EMAIL
        print(f"PASS: arctest2 login: user_id={data['id']}")

    def test_personalized_ideas_endpoint(self, arctest_user_id):
        """GET /api/ideas/personalized/{user_id} should return ideas"""
        res = requests.get(f"{BASE_URL}/api/ideas/personalized/{arctest_user_id}")
        assert res.status_code == 200, f"Expected 200, got {res.status_code}"
        data = res.json()
        assert isinstance(data, list)
        assert len(data) > 0
        print(f"PASS: Personalized ideas returns {len(data)} ideas")
