"""
Sprint 7B Tests:
1. POST /api/auth/verify-phone - Firebase token verification
2. POST /api/users/{user_id}/streak/checkin - ARC +5 on new day check-in
3. POST /api/auth/login - phone_verified / phone_number fields in response
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'http://localhost:8000')

ARCTEST_EMAIL = "arctest2@blueprint.com"
ARCTEST_PASSWORD = "Test123!"

# ============ Fixtures ============

@pytest.fixture(scope="module")
def fresh_test_user():
    """Create a fresh test user for Sprint 7B tests"""
    email = f"TEST_7b_{uuid.uuid4().hex[:8]}@blueprint.com"
    res = requests.post(f"{BASE_URL}/api/auth/signup", json={
        "email": email,
        "password": "TestPass123!",
        "name": "Sprint7B Tester"
    })
    assert res.status_code in [200, 201], f"Could not create test user: {res.text}"
    data = res.json()
    return {"id": data["id"], "email": email, "password": "TestPass123!"}


@pytest.fixture(scope="module")
def arctest_user():
    """Login as arctest2 and return user object"""
    res = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ARCTEST_EMAIL,
        "password": ARCTEST_PASSWORD
    })
    if res.status_code != 200:
        pytest.skip(f"Cannot login as arctest2: {res.text}")
    return res.json()


# ============ Test 1: verify-phone endpoint ============

class TestVerifyPhone:
    """Test POST /api/auth/verify-phone - Firebase phone verification"""

    def test_verify_phone_invalid_token_returns_400(self, fresh_test_user):
        """Invalid Firebase token should return 400 with 'Invalid or expired Firebase token'"""
        res = requests.post(f"{BASE_URL}/api/auth/verify-phone", json={
            "user_id": fresh_test_user["id"],
            "firebase_id_token": "invalid_token_abc123"
        })
        assert res.status_code == 400, f"Expected 400, got {res.status_code}: {res.text}"
        data = res.json()
        assert "detail" in data, f"Expected 'detail' field in error response: {data}"
        assert "Invalid or expired Firebase token" in data["detail"], \
            f"Expected 'Invalid or expired Firebase token' in detail, got: {data['detail']}"
        print(f"PASS: Invalid Firebase token returns 400: {data}")

    def test_verify_phone_missing_token_returns_422(self, fresh_test_user):
        """Missing firebase_id_token should return 422 (validation error)"""
        res = requests.post(f"{BASE_URL}/api/auth/verify-phone", json={
            "user_id": fresh_test_user["id"]
        })
        assert res.status_code == 422, f"Expected 422, got {res.status_code}: {res.text}"
        print(f"PASS: Missing token returns 422")

    def test_verify_phone_nonexistent_user_returns_400_or_404(self):
        """Non-existent user_id with invalid token should fail at Firebase step (400)"""
        fake_user_id = str(uuid.uuid4())
        res = requests.post(f"{BASE_URL}/api/auth/verify-phone", json={
            "user_id": fake_user_id,
            "firebase_id_token": "fake_token_xyz"
        })
        # Firebase verification fails first → 400
        assert res.status_code in [400, 404], f"Expected 400 or 404, got {res.status_code}: {res.text}"
        print(f"PASS: Nonexistent user with invalid token returns {res.status_code}: {res.text}")

    def test_verify_phone_empty_token_returns_400(self, fresh_test_user):
        """Empty string token should return 400"""
        res = requests.post(f"{BASE_URL}/api/auth/verify-phone", json={
            "user_id": fresh_test_user["id"],
            "firebase_id_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.fake_payload.fake_signature"
        })
        assert res.status_code == 400, f"Expected 400 for malformed JWT, got {res.status_code}: {res.text}"
        print(f"PASS: Malformed JWT token returns 400")


# ============ Test 2: Streak Check-in with +5 ARC ============

class TestStreakCheckin:
    """Test POST /api/users/{user_id}/streak/checkin - +5 ARC on new day"""

    def test_first_checkin_awards_5_arc(self, fresh_test_user):
        """First ever check-in should be a new day → arc_awarded=5, message contains '+5 ARC'"""
        user_id = fresh_test_user["id"]
        res = requests.post(f"{BASE_URL}/api/users/{user_id}/streak/checkin")
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        data = res.json()
        assert "arc_awarded" in data, f"arc_awarded field missing from response: {data}"
        assert data["arc_awarded"] == 5, f"Expected arc_awarded=5 for new day, got {data['arc_awarded']}"
        assert "message" in data, f"message field missing: {data}"
        assert "+5 ARC" in data["message"], f"Expected '+5 ARC' in message, got: {data['message']}"
        assert data["is_new_day"] is True, f"Expected is_new_day=True for first check-in, got {data['is_new_day']}"
        assert data["streak_current"] == 1, f"Expected streak_current=1, got {data['streak_current']}"
        print(f"PASS: First check-in: arc_awarded=5, message='{data['message']}'")

    def test_second_checkin_same_day_no_arc(self, fresh_test_user):
        """Second check-in same day should NOT award ARC"""
        user_id = fresh_test_user["id"]
        res = requests.post(f"{BASE_URL}/api/users/{user_id}/streak/checkin")
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        data = res.json()
        assert data["is_new_day"] is False, f"Expected is_new_day=False for same-day check-in, got {data['is_new_day']}"
        assert data.get("arc_awarded", 0) == 0, f"Expected arc_awarded=0 for same-day check-in, got {data.get('arc_awarded')}"
        assert data["message"] == "Already checked in today", f"Expected 'Already checked in today', got: {data['message']}"
        print(f"PASS: Same-day check-in: no ARC, message='{data['message']}'")

    def test_checkin_arc_persisted_in_balance(self, fresh_test_user):
        """ARC from check-in should be persisted in arc_balance"""
        user_id = fresh_test_user["id"]
        res = requests.get(f"{BASE_URL}/api/arc/{user_id}")
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        data = res.json()
        # After first check-in, balance should be 5
        assert data["arc_balance"] >= 5, f"Expected arc_balance >= 5 after check-in, got {data['arc_balance']}"
        print(f"PASS: ARC balance after check-in: {data['arc_balance']}")

    def test_streak_checkin_unknown_user_returns_404(self):
        """Check-in for non-existent user should return 404"""
        fake_id = str(uuid.uuid4())
        res = requests.post(f"{BASE_URL}/api/users/{fake_id}/streak/checkin")
        assert res.status_code == 404, f"Expected 404, got {res.status_code}: {res.text}"
        print(f"PASS: Unknown user check-in returns 404")


# ============ Test 3: Login returns phone_verified / phone_number ============

class TestLoginPhoneFields:
    """Test POST /api/auth/login returns phone_verified and phone_number fields"""

    def test_login_returns_phone_verified_false_for_unverified(self):
        """Login should return phone_verified=False for user who hasn't verified phone"""
        res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ARCTEST_EMAIL,
            "password": ARCTEST_PASSWORD
        })
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        data = res.json()
        assert "phone_verified" in data, f"phone_verified field missing from login response: {data}"
        assert data["phone_verified"] == False, f"Expected phone_verified=False for unverified user, got {data['phone_verified']}"
        print(f"PASS: Login returns phone_verified=False for unverified user")

    def test_login_returns_phone_number_empty_string_for_unverified(self):
        """Login should return phone_number as empty string for user who hasn't verified phone"""
        res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ARCTEST_EMAIL,
            "password": ARCTEST_PASSWORD
        })
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        data = res.json()
        assert "phone_number" in data, f"phone_number field missing from login response: {data}"
        assert data["phone_number"] == "", f"Expected phone_number='' for unverified user, got '{data['phone_number']}'"
        print(f"PASS: Login returns phone_number='' for unverified user")

    def test_login_fresh_user_phone_fields(self, fresh_test_user):
        """Fresh user login should also return phone_verified=False and phone_number=''"""
        res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": fresh_test_user["email"],
            "password": fresh_test_user["password"]
        })
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        data = res.json()
        assert data.get("phone_verified") == False, f"Expected phone_verified=False, got {data.get('phone_verified')}"
        assert data.get("phone_number") == "", f"Expected phone_number='', got '{data.get('phone_number')}'"
        print(f"PASS: Fresh user login phone fields: phone_verified={data.get('phone_verified')}, phone_number='{data.get('phone_number')}'")


# ============ Regression: Core APIs still work ============

class TestSprint7BRegression:
    """Regression checks after Sprint 7B"""

    def test_get_ideas_still_works(self):
        """GET /api/ideas should still return ideas after Sprint 7B"""
        res = requests.get(f"{BASE_URL}/api/ideas")
        assert res.status_code == 200, f"Expected 200, got {res.status_code}"
        data = res.json()
        assert "ideas" in data and len(data["ideas"]) > 0
        print(f"PASS: /api/ideas returns {len(data['ideas'])} ideas")

    def test_arc_endpoint_still_works(self, arctest_user):
        """GET /api/arc/{user_id} should still work"""
        user_id = arctest_user["id"]
        res = requests.get(f"{BASE_URL}/api/arc/{user_id}")
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        data = res.json()
        assert "arc_balance" in data
        print(f"PASS: ARC endpoint works, balance={data['arc_balance']}")

    def test_login_full_response_structure(self):
        """Login response should include all expected fields"""
        res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ARCTEST_EMAIL,
            "password": ARCTEST_PASSWORD
        })
        assert res.status_code == 200
        data = res.json()
        required_fields = ["id", "email", "name", "is_guest", "is_architect", "profile", "phone_verified", "phone_number"]
        for field in required_fields:
            assert field in data, f"Field '{field}' missing from login response: {data}"
        print(f"PASS: Login response has all required fields: {list(data.keys())}")
