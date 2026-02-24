#!/usr/bin/env python3
"""
Backend API Testing for Money-Making Ideas App
Tests all authentication, user profile, ideas, and saved ideas endpoints
"""

import requests
import json
import os
from datetime import datetime

# Get backend URL from frontend .env file
def get_backend_url():
    try:
        with open('/app/frontend/.env', 'r') as f:
            for line in f:
                if line.startswith('EXPO_PUBLIC_BACKEND_URL='):
                    base_url = line.split('=', 1)[1].strip()
                    return f"{base_url}/api"
        return "https://side-hustle-hub-13.preview.emergentagent.com/api"
    except:
        return "https://side-hustle-hub-13.preview.emergentagent.com/api"

BASE_URL = get_backend_url()
print(f"Testing backend at: {BASE_URL}")

# Test data
TEST_USER = {
    "email": "sarah.entrepreneur@example.com",
    "password": "SecurePass123!",
    "name": "Sarah Entrepreneur"
}

TEST_PROFILE = {
    "interests": ["Flipping & Reselling", "Internet-Based", "Service Middleman"],
    "skills": ["Marketing", "Sales", "Research", "Customer Service"],
    "budget": "low",
    "time_availability": "part-time",
    "location": {"lat": 40.7128, "lng": -74.0060}  # NYC coordinates
}

# Global variables to store test data
user_id = None
guest_id = None
idea_id = None
saved_idea_id = None

def test_endpoint(method, endpoint, data=None, expected_status=200, description=""):
    """Helper function to test API endpoints"""
    url = f"{BASE_URL}{endpoint}"
    
    try:
        if method.upper() == "GET":
            response = requests.get(url, timeout=30)
        elif method.upper() == "POST":
            response = requests.post(url, json=data, timeout=30)
        elif method.upper() == "PUT":
            response = requests.put(url, json=data, timeout=30)
        elif method.upper() == "DELETE":
            response = requests.delete(url, timeout=30)
        
        print(f"\n{'='*60}")
        print(f"TEST: {description}")
        print(f"Method: {method.upper()} {endpoint}")
        print(f"Status Code: {response.status_code} (Expected: {expected_status})")
        
        if data:
            print(f"Request Data: {json.dumps(data, indent=2)}")
        
        try:
            response_data = response.json()
            print(f"Response: {json.dumps(response_data, indent=2, default=str)}")
        except:
            print(f"Response Text: {response.text}")
        
        success = response.status_code == expected_status
        print(f"Result: {'✅ PASS' if success else '❌ FAIL'}")
        
        return success, response
        
    except Exception as e:
        print(f"\n{'='*60}")
        print(f"TEST: {description}")
        print(f"Method: {method.upper()} {endpoint}")
        print(f"❌ ERROR: {str(e)}")
        return False, None

def run_all_tests():
    """Run comprehensive backend API tests"""
    global user_id, guest_id, idea_id, saved_idea_id
    
    print(f"🚀 Starting Backend API Tests for Money-Making Ideas App")
    print(f"Backend URL: {BASE_URL}")
    print(f"Test Time: {datetime.now()}")
    
    results = []
    
    # ============= AUTHENTICATION TESTS =============
    print(f"\n🔐 AUTHENTICATION TESTS")
    
    # Test 1: User Signup
    success, response = test_endpoint(
        "POST", "/auth/signup", 
        TEST_USER,
        201 if True else 200,  # Accept both 200 and 201
        "User Signup - Create new user account"
    )
    if success and response:
        try:
            user_data = response.json()
            user_id = user_data.get("id")
            print(f"✅ User created with ID: {user_id}")
        except:
            pass
    results.append(("User Signup", success))
    
    # Test 2: User Login
    success, response = test_endpoint(
        "POST", "/auth/login",
        {"email": TEST_USER["email"], "password": TEST_USER["password"]},
        200,
        "User Login - Authenticate with created user"
    )
    if success and response:
        try:
            login_data = response.json()
            if not user_id:
                user_id = login_data.get("id")
            print(f"✅ Login successful for user: {user_id}")
        except:
            pass
    results.append(("User Login", success))
    
    # Test 3: Guest Account Creation
    success, response = test_endpoint(
        "POST", "/auth/guest",
        None,
        200,
        "Guest Account - Create guest user"
    )
    if success and response:
        try:
            guest_data = response.json()
            guest_id = guest_data.get("id")
            print(f"✅ Guest created with ID: {guest_id}")
        except:
            pass
    results.append(("Guest Account Creation", success))
    
    # ============= USER PROFILE TESTS =============
    print(f"\n👤 USER PROFILE TESTS")
    
    if user_id:
        # Test 4: Update User Profile
        success, response = test_endpoint(
            "PUT", f"/users/{user_id}/profile",
            TEST_PROFILE,
            200,
            "Update User Profile - Set interests, skills, budget, etc."
        )
        results.append(("Update User Profile", success))
        
        # Test 5: Get User Profile
        success, response = test_endpoint(
            "GET", f"/users/{user_id}/profile",
            None,
            200,
            "Get User Profile - Retrieve profile data"
        )
        results.append(("Get User Profile", success))
    else:
        print("❌ Skipping profile tests - no valid user_id")
        results.append(("Update User Profile", False))
        results.append(("Get User Profile", False))
    
    # ============= IDEAS TESTS =============
    print(f"\n💡 IDEAS TESTS")
    
    # Test 6: Get All Ideas
    success, response = test_endpoint(
        "GET", "/ideas",
        None,
        200,
        "Get All Ideas - Should return 15 pre-populated ideas"
    )
    if success and response:
        try:
            ideas = response.json()
            print(f"✅ Retrieved {len(ideas)} ideas")
            if len(ideas) >= 15:
                print(f"✅ Expected 15+ ideas found: {len(ideas)}")
                # Store first idea ID for later tests
                if ideas and len(ideas) > 0:
                    idea_id = ideas[0].get("id")
                    print(f"✅ Using idea ID for tests: {idea_id}")
            else:
                print(f"⚠️ Expected 15+ ideas, got {len(ideas)}")
        except:
            pass
    results.append(("Get All Ideas", success))
    
    # Test 7: Get Personalized Ideas
    if user_id:
        success, response = test_endpoint(
            "GET", f"/ideas/personalized/{user_id}",
            None,
            200,
            "Get Personalized Ideas - Ideas with match scores for user"
        )
        if success and response:
            try:
                personalized_ideas = response.json()
                print(f"✅ Retrieved {len(personalized_ideas)} personalized ideas")
                # Check if ideas have match scores
                if personalized_ideas and len(personalized_ideas) > 0:
                    first_idea = personalized_ideas[0]
                    if "match_score" in first_idea:
                        print(f"✅ Ideas have match scores: {first_idea['match_score']}")
                    else:
                        print(f"⚠️ Ideas missing match scores")
            except:
                pass
        results.append(("Get Personalized Ideas", success))
    else:
        print("❌ Skipping personalized ideas test - no valid user_id")
        results.append(("Get Personalized Ideas", False))
    
    # Test 8: Get Specific Idea
    if idea_id:
        success, response = test_endpoint(
            "GET", f"/ideas/{idea_id}",
            None,
            200,
            f"Get Specific Idea - Retrieve idea details for ID: {idea_id}"
        )
        results.append(("Get Specific Idea", success))
    else:
        print("❌ Skipping specific idea test - no valid idea_id")
        results.append(("Get Specific Idea", False))
    
    # ============= SAVED IDEAS TESTS =============
    print(f"\n💾 SAVED IDEAS TESTS")
    
    if user_id and idea_id:
        # Test 9: Save an Idea
        save_data = {
            "user_id": user_id,
            "idea_id": idea_id,
            "status": "saved",
            "notes": "This looks like a great opportunity for me!"
        }
        success, response = test_endpoint(
            "POST", "/saved-ideas",
            save_data,
            200,
            "Save Idea - Add idea to user's saved list"
        )
        results.append(("Save Idea", success))
        
        # Test 10: Get Saved Ideas
        success, response = test_endpoint(
            "GET", f"/saved-ideas/{user_id}",
            None,
            200,
            "Get Saved Ideas - Retrieve all saved ideas for user"
        )
        if success and response:
            try:
                saved_ideas = response.json()
                print(f"✅ Retrieved {len(saved_ideas)} saved ideas")
            except:
                pass
        results.append(("Get Saved Ideas", success))
        
        # Test 11: Delete Saved Idea
        success, response = test_endpoint(
            "DELETE", f"/saved-ideas/{user_id}/{idea_id}",
            None,
            200,
            "Delete Saved Idea - Remove idea from saved list"
        )
        results.append(("Delete Saved Idea", success))
        
    else:
        print("❌ Skipping saved ideas tests - missing user_id or idea_id")
        results.append(("Save Idea", False))
        results.append(("Get Saved Ideas", False))
        results.append(("Delete Saved Idea", False))
    
    # ============= ERROR HANDLING TESTS =============
    print(f"\n🚨 ERROR HANDLING TESTS")
    
    # Test 12: Invalid Login
    success, response = test_endpoint(
        "POST", "/auth/login",
        {"email": "nonexistent@example.com", "password": "wrongpass"},
        401,
        "Invalid Login - Should return 401 for wrong credentials"
    )
    results.append(("Invalid Login Error", success))
    
    # Test 13: Non-existent User Profile
    success, response = test_endpoint(
        "GET", "/users/nonexistent-id/profile",
        None,
        404,
        "Non-existent User Profile - Should return 404"
    )
    results.append(("Non-existent User Error", success))
    
    # Test 14: Non-existent Idea
    success, response = test_endpoint(
        "GET", "/ideas/nonexistent-idea-id",
        None,
        404,
        "Non-existent Idea - Should return 404"
    )
    results.append(("Non-existent Idea Error", success))
    
    # ============= SUMMARY =============
    print(f"\n{'='*60}")
    print(f"🏁 TEST SUMMARY")
    print(f"{'='*60}")
    
    passed = sum(1 for _, success in results if success)
    total = len(results)
    
    print(f"Total Tests: {total}")
    print(f"Passed: {passed}")
    print(f"Failed: {total - passed}")
    print(f"Success Rate: {(passed/total)*100:.1f}%")
    
    print(f"\nDetailed Results:")
    for test_name, success in results:
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"  {status} {test_name}")
    
    # Critical Issues
    critical_failures = []
    for test_name, success in results:
        if not success and test_name in [
            "User Signup", "User Login", "Get All Ideas", 
            "Save Idea", "Get Saved Ideas"
        ]:
            critical_failures.append(test_name)
    
    if critical_failures:
        print(f"\n🚨 CRITICAL FAILURES:")
        for failure in critical_failures:
            print(f"  ❌ {failure}")
    
    return results, passed, total

if __name__ == "__main__":
    results, passed, total = run_all_tests()
    
    if passed == total:
        print(f"\n🎉 ALL TESTS PASSED! Backend API is working correctly.")
        exit(0)
    else:
        print(f"\n⚠️ {total - passed} tests failed. Please check the issues above.")
        exit(1)