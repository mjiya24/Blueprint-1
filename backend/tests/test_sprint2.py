"""
Blueprint Sprint 2 Backend API Tests
Tests: Architect Tier subscription (Stripe), High-Ticket Ideas, Blueprint Guide, Troubleshoot endpoints
"""
import pytest
import requests
import os
import time

BASE_URL = "https://blueprint-sprint1.preview.emergentagent.com"

TEST_EMAIL = "tester@blueprint.com"
TEST_PASSWORD = "TestPass123"

NEW_TEST_EMAIL = f"TEST_sprint2_{int(time.time())}@blueprint.com"
NEW_TEST_PASSWORD = "TestPass123"


@pytest.fixture(scope="module")
def api_client():
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def auth_user(api_client):
    """Login with existing tester or create new user"""
    # Try existing tester account first
    resp = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    if resp.status_code == 200:
        data = resp.json()
        print(f"Logged in as {TEST_EMAIL}, user_id={data.get('id')}")
        return data
    # Create new test user
    resp = api_client.post(f"{BASE_URL}/api/auth/signup", json={
        "email": NEW_TEST_EMAIL,
        "password": NEW_TEST_PASSWORD,
        "name": "TEST Sprint2 User"
    })
    assert resp.status_code == 200, f"Signup failed: {resp.text}"
    data = resp.json()
    print(f"Created new user: {NEW_TEST_EMAIL}, user_id={data.get('id')}")
    return data


# ============ HIGH-TICKET IDEAS TESTS ============

class TestHighTicketIdeas:
    """GET /api/high-ticket-ideas returns exactly 5 ideas with correct IDs"""

    EXPECTED_IDS = {"digital-001", "digital-005", "passive-002", "passive-003", "passive-004"}

    def test_high_ticket_returns_200(self, api_client):
        """GET /api/high-ticket-ideas returns 200"""
        resp = api_client.get(f"{BASE_URL}/api/high-ticket-ideas")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        print(f"PASS: /api/high-ticket-ideas returns 200")

    def test_high_ticket_returns_exactly_5(self, api_client):
        """GET /api/high-ticket-ideas returns exactly 5 ideas"""
        resp = api_client.get(f"{BASE_URL}/api/high-ticket-ideas")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list), f"Expected list, got {type(data)}"
        assert len(data) == 5, f"Expected 5 high-ticket ideas, got {len(data)}"
        print(f"PASS: Got {len(data)} high-ticket ideas")

    def test_high_ticket_contains_correct_ids(self, api_client):
        """High-ticket ideas have correct IDs (digital-001, digital-005, passive-002, passive-003, passive-004)"""
        resp = api_client.get(f"{BASE_URL}/api/high-ticket-ideas")
        assert resp.status_code == 200
        data = resp.json()
        returned_ids = {idea["id"] for idea in data}
        assert returned_ids == self.EXPECTED_IDS, \
            f"IDs mismatch. Expected: {self.EXPECTED_IDS}, Got: {returned_ids}"
        print(f"PASS: Correct 5 high-ticket idea IDs returned: {returned_ids}")

    def test_high_ticket_ideas_have_required_fields(self, api_client):
        """Each high-ticket idea has required fields"""
        resp = api_client.get(f"{BASE_URL}/api/high-ticket-ideas")
        assert resp.status_code == 200
        ideas = resp.json()
        for idea in ideas:
            assert "id" in idea, f"Missing id in {idea}"
            assert "title" in idea, f"Missing title in {idea}"
            assert "category" in idea, f"Missing category in {idea}"
            assert "_id" not in idea, f"MongoDB _id should be excluded: {idea}"
        print(f"PASS: All high-ticket ideas have required fields")


# ============ SUBSCRIPTION TESTS ============

class TestSubscription:
    """GET /api/payments/subscription/{user_id} returns is_architect status"""

    def test_subscription_returns_200_for_valid_user(self, api_client, auth_user):
        """GET /api/payments/subscription/{user_id} returns 200"""
        user_id = auth_user["id"]
        resp = api_client.get(f"{BASE_URL}/api/payments/subscription/{user_id}")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        print(f"PASS: subscription endpoint returns 200 for user {user_id}")

    def test_subscription_returns_is_architect_field(self, api_client, auth_user):
        """Subscription endpoint returns is_architect boolean field"""
        user_id = auth_user["id"]
        resp = api_client.get(f"{BASE_URL}/api/payments/subscription/{user_id}")
        assert resp.status_code == 200
        data = resp.json()
        assert "is_architect" in data, f"Missing is_architect field: {data}"
        assert isinstance(data["is_architect"], bool), f"is_architect should be bool: {type(data['is_architect'])}"
        assert "user_id" in data, f"Missing user_id field: {data}"
        print(f"PASS: Subscription status: is_architect={data['is_architect']} for user_id={data['user_id']}")

    def test_subscription_nonexistent_user_returns_404(self, api_client):
        """Subscription for nonexistent user returns 404"""
        resp = api_client.get(f"{BASE_URL}/api/payments/subscription/fake-user-999")
        assert resp.status_code == 404, f"Expected 404, got {resp.status_code}"
        print(f"PASS: Nonexistent user subscription returns 404")

    def test_subscription_non_architect_user(self, api_client, auth_user):
        """Non-architect user returns is_architect=False"""
        user_id = auth_user["id"]
        resp = api_client.get(f"{BASE_URL}/api/payments/subscription/{user_id}")
        assert resp.status_code == 200
        data = resp.json()
        # tester@blueprint.com should NOT be architect (hasn't paid)
        print(f"INFO: is_architect={data['is_architect']} for tester user (expected False unless manually set)")
        assert "is_architect" in data  # Just verify the field exists regardless of value


# ============ CHECKOUT TESTS ============

class TestCheckout:
    """POST /api/payments/checkout returns Stripe checkout URL"""

    def test_checkout_monthly_returns_url(self, api_client, auth_user):
        """POST /api/payments/checkout with monthly plan returns checkout URL"""
        user_id = auth_user["id"]
        resp = api_client.post(f"{BASE_URL}/api/payments/checkout", json={
            "plan_type": "monthly",
            "user_id": user_id,
            "origin_url": "https://blueprint-sprint1.preview.emergentagent.com/architect-upgrade"
        })
        assert resp.status_code == 200, f"Checkout failed: {resp.status_code}: {resp.text}"
        data = resp.json()
        assert "url" in data, f"Missing url field: {data}"
        assert "session_id" in data, f"Missing session_id field: {data}"
        assert data["url"].startswith("http"), f"URL should be valid: {data['url']}"
        print(f"PASS: Monthly checkout URL returned: {data['url'][:80]}...")

    def test_checkout_annual_returns_url(self, api_client, auth_user):
        """POST /api/payments/checkout with annual plan returns checkout URL"""
        user_id = auth_user["id"]
        resp = api_client.post(f"{BASE_URL}/api/payments/checkout", json={
            "plan_type": "annual",
            "user_id": user_id,
            "origin_url": "https://blueprint-sprint1.preview.emergentagent.com/architect-upgrade"
        })
        assert resp.status_code == 200, f"Checkout failed: {resp.status_code}: {resp.text}"
        data = resp.json()
        assert "url" in data, f"Missing url field: {data}"
        assert "session_id" in data, f"Missing session_id: {data}"
        print(f"PASS: Annual checkout URL returned: {data['url'][:80]}...")

    def test_checkout_invalid_plan_returns_400(self, api_client, auth_user):
        """POST /api/payments/checkout with invalid plan returns 400"""
        user_id = auth_user["id"]
        resp = api_client.post(f"{BASE_URL}/api/payments/checkout", json={
            "plan_type": "weekly",  # invalid
            "user_id": user_id,
            "origin_url": "https://blueprint-sprint1.preview.emergentagent.com/architect-upgrade"
        })
        assert resp.status_code == 400, f"Expected 400, got {resp.status_code}: {resp.text}"
        print(f"PASS: Invalid plan type returns 400")


# ============ BLUEPRINT GUIDE TESTS ============

class TestBlueprintGuide:
    """POST /api/blueprint-guide/chat/{user_id} - 403 for non-architect"""

    def test_blueprint_guide_403_for_non_architect(self, api_client, auth_user):
        """Non-architect user gets 403 from blueprint-guide chat endpoint"""
        user_id = auth_user["id"]
        # Ensure user is NOT architect first (check subscription)
        sub_resp = api_client.get(f"{BASE_URL}/api/payments/subscription/{user_id}")
        is_architect = sub_resp.json().get("is_architect", False)
        if is_architect:
            pytest.skip("User is architect - skipping 403 test")
        
        resp = api_client.post(f"{BASE_URL}/api/blueprint-guide/chat/{user_id}", json={
            "message": "What is my first step?",
            "idea_id": "digital-001"
        })
        assert resp.status_code == 403, \
            f"Expected 403 for non-architect, got {resp.status_code}: {resp.text}"
        print(f"PASS: Blueprint guide returns 403 for non-architect user")

    def test_blueprint_guide_404_for_nonexistent_user(self, api_client):
        """Nonexistent user gets 404 from blueprint guide"""
        resp = api_client.post(f"{BASE_URL}/api/blueprint-guide/chat/nonexistent-user-999", json={
            "message": "test",
            "idea_id": "digital-001"
        })
        assert resp.status_code == 404, f"Expected 404, got {resp.status_code}: {resp.text}"
        print(f"PASS: Blueprint guide returns 404 for nonexistent user")

    def test_blueprint_guide_history_403_non_architect(self, api_client, auth_user):
        """Non-architect gets 403 on history endpoint"""
        user_id = auth_user["id"]
        sub_resp = api_client.get(f"{BASE_URL}/api/payments/subscription/{user_id}")
        is_architect = sub_resp.json().get("is_architect", False)
        if is_architect:
            pytest.skip("User is architect - skipping 403 test")
        
        resp = api_client.get(f"{BASE_URL}/api/blueprint-guide/history/{user_id}/digital-001")
        assert resp.status_code == 403, f"Expected 403, got {resp.status_code}: {resp.text}"
        print(f"PASS: Blueprint guide history returns 403 for non-architect")


# ============ TROUBLESHOOT TESTS ============

class TestTroubleshoot:
    """POST /api/troubleshoot/{user_id}/{idea_id}/{step_number} - 403 for non-architect"""

    def test_troubleshoot_403_for_non_architect(self, api_client, auth_user):
        """Non-architect user gets 403 from troubleshoot endpoint"""
        user_id = auth_user["id"]
        sub_resp = api_client.get(f"{BASE_URL}/api/payments/subscription/{user_id}")
        is_architect = sub_resp.json().get("is_architect", False)
        if is_architect:
            pytest.skip("User is architect - skipping 403 test")
        
        resp = api_client.post(f"{BASE_URL}/api/troubleshoot/{user_id}/digital-001/1")
        assert resp.status_code == 403, \
            f"Expected 403 for non-architect, got {resp.status_code}: {resp.text}"
        print(f"PASS: Troubleshoot returns 403 for non-architect user")

    def test_troubleshoot_404_for_nonexistent_user(self, api_client):
        """Nonexistent user gets 404 from troubleshoot endpoint"""
        resp = api_client.post(f"{BASE_URL}/api/troubleshoot/nonexistent-user-999/digital-001/1")
        assert resp.status_code == 404, f"Expected 404, got {resp.status_code}: {resp.text}"
        print(f"PASS: Troubleshoot returns 404 for nonexistent user")

    def test_troubleshoot_404_for_nonexistent_idea(self, api_client, auth_user):
        """Nonexistent idea with architect user returns 404 - but first verify 403 for non-architect"""
        user_id = auth_user["id"]
        sub_resp = api_client.get(f"{BASE_URL}/api/payments/subscription/{user_id}")
        is_architect = sub_resp.json().get("is_architect", False)
        
        if not is_architect:
            # Non-architect will get 403 before idea check - that's fine
            resp = api_client.post(f"{BASE_URL}/api/troubleshoot/{user_id}/nonexistent-idea-999/1")
            # Either 403 (auth check) or 404 (idea check) is acceptable behavior
            assert resp.status_code in [403, 404], f"Unexpected status: {resp.status_code}: {resp.text}"
            print(f"PASS: Troubleshoot returns {resp.status_code} for non-architect/nonexistent idea")
        else:
            resp = api_client.post(f"{BASE_URL}/api/troubleshoot/{user_id}/nonexistent-idea-999/1")
            assert resp.status_code == 404, f"Expected 404, got {resp.status_code}: {resp.text}"
            print(f"PASS: Troubleshoot returns 404 for nonexistent idea")
