"""
Blueprint Backend API Tests
Tests: auth, profile/questionnaire, ideas, personalized scores, saved ideas, step completion
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', '').rstrip('/')

TEST_EMAIL = "TEST_tester_blueprint@blueprint.com"
TEST_PASSWORD = "TestPass123"
TEST_NAME = "TEST Blueprint Tester"
TEST_USER_ID = None


@pytest.fixture(scope="module")
def api_client():
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def auth_user(api_client):
    """Create or login test user, return user data"""
    # Try signup first
    resp = api_client.post(f"{BASE_URL}/api/auth/signup", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD,
        "name": TEST_NAME
    })
    if resp.status_code == 400:
        # Already exists, login
        resp = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
    assert resp.status_code == 200, f"Auth failed: {resp.text}"
    data = resp.json()
    assert "id" in data
    return data


# ============ AUTH TESTS ============

class TestAuth:
    """Authentication endpoint tests"""

    def test_signup_returns_user_with_profile(self, api_client):
        """POST /api/auth/signup returns user with profile field"""
        # Use unique email
        unique_email = f"TEST_signup_{int(time.time())}@blueprint.com"
        resp = api_client.post(f"{BASE_URL}/api/auth/signup", json={
            "email": unique_email,
            "password": "TestPass123",
            "name": "TEST Signup User"
        })
        assert resp.status_code == 200, f"Signup failed: {resp.text}"
        data = resp.json()
        assert "id" in data, "Missing id"
        assert "email" in data, "Missing email"
        assert "name" in data, "Missing name"
        assert "profile" in data, "Missing profile field - REQUIRED"
        assert "is_guest" in data, "Missing is_guest"
        assert data["is_guest"] is False
        print(f"PASS: Signup returns user with profile: {list(data.keys())}")

    def test_signup_duplicate_email_returns_400(self, api_client, auth_user):
        """Duplicate signup should return 400"""
        resp = api_client.post(f"{BASE_URL}/api/auth/signup", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD,
            "name": TEST_NAME
        })
        assert resp.status_code == 400
        print("PASS: Duplicate signup returns 400")

    def test_login_returns_user_with_profile(self, api_client, auth_user):
        """POST /api/auth/login returns user with profile"""
        resp = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert resp.status_code == 200, f"Login failed: {resp.text}"
        data = resp.json()
        assert "id" in data
        assert "profile" in data, "Login response missing profile field"
        print(f"PASS: Login returns user with profile. Keys: {list(data.keys())}")

    def test_login_wrong_password_returns_401(self, api_client):
        """Wrong password returns 401"""
        resp = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": "WrongPass999"
        })
        assert resp.status_code == 401
        print("PASS: Wrong password returns 401")

    def test_guest_login_creates_guest(self, api_client):
        """POST /api/auth/guest creates guest user"""
        resp = api_client.post(f"{BASE_URL}/api/auth/guest")
        assert resp.status_code == 200, f"Guest login failed: {resp.text}"
        data = resp.json()
        assert data["is_guest"] is True
        assert "id" in data
        print(f"PASS: Guest created with id: {data['id']}")


# ============ PROFILE / QUESTIONNAIRE TESTS ============

class TestProfile:
    """Questionnaire & profile endpoint tests"""

    def test_update_profile_questionnaire_fields(self, api_client, auth_user):
        """PUT /api/users/{id}/profile saves questionnaire fields"""
        user_id = auth_user["id"]
        profile_data = {
            "environment": "home",
            "social_preference": "solo",
            "assets": ["laptop"],
            "questionnaire_interests": ["tech", "finance"],
            "interests": [],
            "skills": [],
            "budget": "",
            "time_availability": "",
            "push_token": ""
        }
        resp = api_client.put(f"{BASE_URL}/api/users/{user_id}/profile", json=profile_data)
        assert resp.status_code == 200, f"Profile update failed: {resp.text}"
        data = resp.json()
        assert "message" in data
        print(f"PASS: Profile updated. Response: {data}")

    def test_get_profile_returns_questionnaire_fields(self, api_client, auth_user):
        """GET /api/users/{id}/profile returns environment/social/assets/interests"""
        user_id = auth_user["id"]
        resp = api_client.get(f"{BASE_URL}/api/users/{user_id}/profile")
        assert resp.status_code == 200, f"Get profile failed: {resp.text}"
        data = resp.json()
        assert data.get("environment") == "home", f"environment mismatch: {data.get('environment')}"
        assert data.get("social_preference") == "solo", f"social_preference mismatch: {data.get('social_preference')}"
        assert "laptop" in data.get("assets", []), f"assets mismatch: {data.get('assets')}"
        assert "tech" in data.get("questionnaire_interests", []), f"questionnaire_interests mismatch: {data.get('questionnaire_interests')}"
        print(f"PASS: Profile fields correct: environment={data['environment']}, social={data['social_preference']}, assets={data['assets']}, interests={data['questionnaire_interests']}")

    def test_profile_nonexistent_user_returns_404(self, api_client):
        """Get profile for fake user returns 404"""
        resp = api_client.get(f"{BASE_URL}/api/users/nonexistent-id-12345/profile")
        assert resp.status_code == 404
        print("PASS: Nonexistent user profile returns 404")


# ============ IDEAS TESTS ============

class TestIdeas:
    """Ideas endpoint tests"""

    def test_get_all_ideas_returns_20(self, api_client):
        """GET /api/ideas returns 20 ideas"""
        resp = api_client.get(f"{BASE_URL}/api/ideas", params={"limit": 100})
        assert resp.status_code == 200, f"Get ideas failed: {resp.text}"
        data = resp.json()
        assert "ideas" in data
        assert "total" in data
        assert len(data["ideas"]) == 20, f"Expected 20 ideas, got {len(data['ideas'])}"
        print(f"PASS: Got {len(data['ideas'])} ideas, total={data['total']}")

    def test_get_ideas_has_all_4_categories(self, api_client):
        """Ideas include all 4 categories"""
        resp = api_client.get(f"{BASE_URL}/api/ideas", params={"limit": 100})
        assert resp.status_code == 200
        ideas = resp.json()["ideas"]
        categories = set(i["category"] for i in ideas)
        expected = {"Gig Economy", "Local & Service Based", "Digital & Freelance", "Passive/Scalable"}
        assert categories == expected, f"Categories mismatch: {categories}"
        print(f"PASS: All 4 categories present: {categories}")

    def test_get_ideas_category_filter(self, api_client):
        """Category filter works"""
        resp = api_client.get(f"{BASE_URL}/api/ideas", params={"category": "Gig Economy"})
        assert resp.status_code == 200
        ideas = resp.json()["ideas"]
        assert all(i["category"] == "Gig Economy" for i in ideas)
        assert len(ideas) == 5, f"Expected 5 Gig Economy ideas, got {len(ideas)}"
        print(f"PASS: Category filter returns {len(ideas)} Gig Economy ideas")

    def test_get_single_idea(self, api_client):
        """GET /api/ideas/{id} returns idea details"""
        resp = api_client.get(f"{BASE_URL}/api/ideas/gig-001")
        assert resp.status_code == 200
        idea = resp.json()
        assert idea["id"] == "gig-001"
        assert "title" in idea
        assert "action_steps" in idea
        assert "potential_earnings" in idea
        print(f"PASS: Got idea: {idea['title']}")

    def test_get_idea_with_user_id_includes_match_score(self, api_client, auth_user):
        """GET /api/ideas/{id}?user_id= returns match_score"""
        user_id = auth_user["id"]
        resp = api_client.get(f"{BASE_URL}/api/ideas/digital-001", params={"user_id": user_id})
        assert resp.status_code == 200
        idea = resp.json()
        assert "match_score" in idea, "match_score missing when user_id provided"
        assert 0 <= idea["match_score"] <= 100
        print(f"PASS: Got idea with match_score: {idea['match_score']}")

    def test_get_idea_nonexistent_returns_404(self, api_client):
        """Nonexistent idea returns 404"""
        resp = api_client.get(f"{BASE_URL}/api/ideas/nonexistent-999")
        assert resp.status_code == 404
        print("PASS: Nonexistent idea returns 404")


# ============ PERSONALIZED IDEAS TESTS ============

class TestPersonalizedIdeas:
    """Personalized match score endpoint tests"""

    def test_personalized_returns_match_scores(self, api_client, auth_user):
        """GET /api/ideas/personalized/{user_id} returns ideas with match_score"""
        user_id = auth_user["id"]
        resp = api_client.get(f"{BASE_URL}/api/ideas/personalized/{user_id}")
        assert resp.status_code == 200, f"Personalized ideas failed: {resp.text}"
        data = resp.json()
        assert isinstance(data, list), "Should return a list"
        assert len(data) == 20, f"Expected 20 ideas, got {len(data)}"
        for idea in data:
            assert "match_score" in idea, f"idea {idea.get('id')} missing match_score"
            assert 0 <= idea["match_score"] <= 100
        print(f"PASS: Got {len(data)} personalized ideas with match scores")

    def test_home_user_gets_digital_ideas_higher_scores(self, api_client, auth_user):
        """User with home+laptop+tech profile should get Digital & Freelance ideas ranked higher"""
        user_id = auth_user["id"]
        # Profile was set to home, solo, laptop, tech+finance - digital ideas should score higher
        resp = api_client.get(f"{BASE_URL}/api/ideas/personalized/{user_id}")
        assert resp.status_code == 200
        ideas = resp.json()
        # Find the top-ranked idea
        top_idea = ideas[0]
        assert top_idea["match_score"] >= 70, f"Top idea score too low: {top_idea['match_score']}"
        
        # Digital ideas should appear in top 5 for home+laptop+tech user
        top5_categories = [i["category"] for i in ideas[:5]]
        digital_in_top5 = top5_categories.count("Digital & Freelance")
        assert digital_in_top5 >= 2, f"Expected Digital & Freelance in top 5, got: {top5_categories}"
        print(f"PASS: Top idea: '{top_idea['title']}' with score {top_idea['match_score']}%")
        print(f"PASS: Top 5 categories: {top5_categories}")

    def test_outdoor_gig_ideas_rank_lower_for_home_user(self, api_client, auth_user):
        """Outdoor/car ideas (DoorDash, Uber) should rank lower for home+laptop user"""
        user_id = auth_user["id"]
        resp = api_client.get(f"{BASE_URL}/api/ideas/personalized/{user_id}")
        ideas = resp.json()
        # Find gig-001 (DoorDash) and gig-002 (Uber) scores
        scores = {i["id"]: i["match_score"] for i in ideas}
        doordash_score = scores.get("gig-001", -1)
        uber_score = scores.get("gig-002", -1)
        va_score = scores.get("digital-002", -1)
        web_score = scores.get("digital-001", -1)
        assert doordash_score != -1 and uber_score != -1
        assert va_score > doordash_score, f"VA score {va_score} should be > DoorDash {doordash_score}"
        print(f"PASS: DoorDash score={doordash_score}, Uber score={uber_score}, VA score={va_score}, WebDesign score={web_score}")

    def test_personalized_ideas_sorted_descending(self, api_client, auth_user):
        """Personalized ideas should be sorted by match_score descending"""
        user_id = auth_user["id"]
        resp = api_client.get(f"{BASE_URL}/api/ideas/personalized/{user_id}")
        ideas = resp.json()
        scores = [i["match_score"] for i in ideas]
        assert scores == sorted(scores, reverse=True), f"Ideas not sorted by score: {scores[:5]}"
        print(f"PASS: Ideas sorted descending. Top scores: {scores[:5]}")

    def test_personalized_nonexistent_user_returns_404(self, api_client):
        """Nonexistent user returns 404"""
        resp = api_client.get(f"{BASE_URL}/api/ideas/personalized/fake-user-999")
        assert resp.status_code == 404
        print("PASS: Nonexistent user personalized returns 404")


# ============ SAVED IDEAS TESTS ============

class TestSavedIdeas:
    """Saved ideas and action step tests"""

    def test_save_idea(self, api_client, auth_user):
        """POST /api/saved-ideas saves an idea with action_steps"""
        user_id = auth_user["id"]
        # Clean up first
        api_client.delete(f"{BASE_URL}/api/saved-ideas/{user_id}/digital-002")
        
        resp = api_client.post(f"{BASE_URL}/api/saved-ideas", json={
            "user_id": user_id,
            "idea_id": "digital-002",
            "status": "saved"
        })
        assert resp.status_code == 200, f"Save idea failed: {resp.text}"
        data = resp.json()
        assert "message" in data
        print(f"PASS: Saved idea. Response: {data}")

    def test_get_saved_idea_returns_action_steps(self, api_client, auth_user):
        """GET /api/saved-ideas/{user_id}/{idea_id} returns action_steps array"""
        user_id = auth_user["id"]
        resp = api_client.get(f"{BASE_URL}/api/saved-ideas/{user_id}/digital-002")
        assert resp.status_code == 200, f"Get saved idea failed: {resp.text}"
        data = resp.json()
        assert data is not None, "Saved idea not found"
        assert "action_steps" in data, "Missing action_steps"
        assert len(data["action_steps"]) > 0, "action_steps empty"
        assert data.get("progress_percentage") == 0, f"Initial progress should be 0, got {data.get('progress_percentage')}"
        # Check action step structure
        step = data["action_steps"][0]
        assert "step_number" in step
        assert "text" in step
        assert "completed" in step
        assert step["completed"] is False
        print(f"PASS: Got saved idea with {len(data['action_steps'])} action steps")

    def test_complete_step_updates_progress(self, api_client, auth_user):
        """POST /api/saved-ideas/{user_id}/{idea_id}/complete-step returns progress_percentage"""
        user_id = auth_user["id"]
        resp = api_client.post(f"{BASE_URL}/api/saved-ideas/{user_id}/digital-002/complete-step",
                               json={"step_number": 1})
        assert resp.status_code == 200, f"Complete step failed: {resp.text}"
        data = resp.json()
        assert "progress_percentage" in data, "Missing progress_percentage"
        assert data["progress_percentage"] > 0, "Progress should increase after step completion"
        assert "earnings_unlocked" in data
        assert "status" in data
        assert "trigger_celebration" in data
        print(f"PASS: Step completed. Progress: {data['progress_percentage']}%, earnings_unlocked: {data['earnings_unlocked']}")

    def test_complete_same_step_twice_returns_400(self, api_client, auth_user):
        """Completing same step twice returns 400"""
        user_id = auth_user["id"]
        resp = api_client.post(f"{BASE_URL}/api/saved-ideas/{user_id}/digital-002/complete-step",
                               json={"step_number": 1})
        assert resp.status_code == 400, f"Expected 400 for duplicate step, got {resp.status_code}"
        print("PASS: Duplicate step completion returns 400")

    def test_progress_persists_after_completion(self, api_client, auth_user):
        """After completing step, GET shows updated progress"""
        user_id = auth_user["id"]
        # Complete another step
        api_client.post(f"{BASE_URL}/api/saved-ideas/{user_id}/digital-002/complete-step",
                        json={"step_number": 2})
        # Verify persisted
        resp = api_client.get(f"{BASE_URL}/api/saved-ideas/{user_id}/digital-002")
        assert resp.status_code == 200
        data = resp.json()
        completed_count = sum(1 for s in data["action_steps"] if s["completed"])
        assert completed_count >= 2, f"Expected 2+ completed steps, got {completed_count}"
        assert data["progress_percentage"] > 0
        print(f"PASS: Progress persisted: {data['progress_percentage']}%, {completed_count} steps completed")

    def test_earnings_unlocked_after_3_steps(self, api_client, auth_user):
        """After 3 step completions, earnings_unlocked should be True"""
        user_id = auth_user["id"]
        # Complete step 3
        api_client.post(f"{BASE_URL}/api/saved-ideas/{user_id}/digital-002/complete-step",
                        json={"step_number": 3})
        resp = api_client.get(f"{BASE_URL}/api/saved-ideas/{user_id}/digital-002")
        assert resp.status_code == 200
        data = resp.json()
        assert data.get("earnings_unlocked") is True, f"earnings_unlocked should be True after 3 steps. Got: {data.get('earnings_unlocked')}"
        print(f"PASS: earnings_unlocked=True after 3 steps. Progress: {data['progress_percentage']}%")

    def test_get_all_saved_ideas(self, api_client, auth_user):
        """GET /api/saved-ideas/{user_id} returns list"""
        user_id = auth_user["id"]
        resp = api_client.get(f"{BASE_URL}/api/saved-ideas/{user_id}")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        assert len(data) >= 1
        print(f"PASS: Got {len(data)} saved ideas")

    def test_delete_saved_idea(self, api_client, auth_user):
        """DELETE /api/saved-ideas/{user_id}/{idea_id} removes idea"""
        user_id = auth_user["id"]
        # Save a new idea for deletion test
        api_client.post(f"{BASE_URL}/api/saved-ideas", json={
            "user_id": user_id,
            "idea_id": "gig-001",
            "status": "saved"
        })
        resp = api_client.delete(f"{BASE_URL}/api/saved-ideas/{user_id}/gig-001")
        assert resp.status_code == 200, f"Delete failed: {resp.text}"
        # Verify deleted
        get_resp = api_client.get(f"{BASE_URL}/api/saved-ideas/{user_id}/gig-001")
        assert get_resp.status_code == 200
        assert get_resp.json() is None, "Idea should be None after deletion"
        print("PASS: Idea deleted and verified via GET")


# ============ CLEANUP ============

@pytest.fixture(scope="module", autouse=True)
def cleanup_test_user(api_client):
    """Run tests, then cleanup test data"""
    yield
    # Note: No direct delete user endpoint, but cleanup saved ideas
    pass
