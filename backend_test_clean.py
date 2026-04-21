#!/usr/bin/env python3
"""
BARBER HUB v3.6.1 Security Fixes Verification Test Suite - Clean Version
Testing MEDIUM-priority security fixes as requested in review.
"""

import requests
import json
import time
import random
import string
from pymongo import MongoClient
import os
from dotenv import load_dotenv

# Load environment
load_dotenv('/app/backend/.env')

# Configuration
BASE_URL = "https://security-audit-110.preview.emergentagent.com/api"
SEED_TOKEN = "Seed_BHub_v36_X9Q2pT7vNcL8sJrK4mWzYbHfDgEa_c1u3iQoR5xZpV0nBkM6tH9wY2sLcA8jUe"
ADMIN_PHONE = "admin"
ADMIN_PASSWORD = "NewStrong2026!xYz"

# MongoDB connection for direct database manipulation
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'barber_hub')

def get_mongo_client():
    """Get MongoDB client for direct database access"""
    return MongoClient(MONGO_URL)

def generate_random_phone():
    """Generate a random phone number for testing"""
    return "09" + ''.join(random.choices(string.digits, k=8))

def test_password_policy():
    """Test 1: Password policy (8 chars + at least one digit)"""
    print("\n=== TEST 1: Password Policy Validation ===")
    
    results = []
    
    # Test weak password on customer registration
    phone1 = generate_random_phone()
    payload1 = {
        "phone_number": phone1,
        "password": "weak",
        "full_name": "Test User",
        "gender": "male",
        "country": "Syria",
        "city": "Damascus"
    }
    
    response1 = requests.post(f"{BASE_URL}/auth/register", json=payload1)
    if response1.status_code == 422 and "at least 8 characters" in response1.text:
        results.append("✅ Customer register - weak password: PASS")
    else:
        results.append(f"❌ Customer register - weak password: FAIL - Status {response1.status_code}")
    
    # Test no digits on customer registration
    phone2 = generate_random_phone()
    payload2 = {
        "phone_number": phone2,
        "password": "onlyletters",
        "full_name": "Test User",
        "gender": "male",
        "country": "Syria",
        "city": "Damascus"
    }
    
    response2 = requests.post(f"{BASE_URL}/auth/register", json=payload2)
    if response2.status_code == 422 and "must contain at least one number" in response2.text:
        results.append("✅ Customer register - no digits: PASS")
    else:
        results.append(f"❌ Customer register - no digits: FAIL - Status {response2.status_code}")
    
    # Test good password on customer registration
    phone3 = generate_random_phone()
    payload3 = {
        "phone_number": phone3,
        "password": "goodpass1",
        "full_name": "Test User",
        "gender": "male",
        "country": "Syria",
        "city": "Damascus"
    }
    
    response3 = requests.post(f"{BASE_URL}/auth/register", json=payload3)
    if response3.status_code in [200, 201] and "access_token" in response3.text:
        results.append("✅ Customer register - good password: PASS")
    else:
        results.append(f"❌ Customer register - good password: FAIL - Status {response3.status_code}")
    
    # Test barbershop registration with weak password
    phone4 = generate_random_phone()
    payload4 = {
        "phone_number": phone4,
        "password": "weak",
        "owner_name": "Test Owner",
        "shop_name": "Test Salon",
        "shop_type": "male",
        "country": "Syria",
        "city": "Damascus"
    }
    
    response4 = requests.post(f"{BASE_URL}/auth/register-barbershop", json=payload4)
    if response4.status_code == 422 and "at least 8 characters" in response4.text:
        results.append("✅ Barbershop register - weak password: PASS")
    else:
        results.append(f"❌ Barbershop register - weak password: FAIL - Status {response4.status_code}")
    
    # Test barbershop registration with good password
    phone5 = generate_random_phone()
    payload5 = {
        "phone_number": phone5,
        "password": "goodpass1",
        "owner_name": "Test Owner",
        "shop_name": "Test Salon",
        "shop_type": "male",
        "country": "Syria",
        "city": "Damascus"
    }
    
    response5 = requests.post(f"{BASE_URL}/auth/register-barbershop", json=payload5)
    if response5.status_code in [200, 201] and "access_token" in response5.text:
        results.append("✅ Barbershop register - good password: PASS")
    else:
        results.append(f"❌ Barbershop register - good password: FAIL - Status {response5.status_code}")
    
    return results

def test_password_change_endpoint():
    """Test 2: Password change endpoint"""
    print("\n=== TEST 2: Password Change Endpoint ===")
    
    results = []
    
    # Create a fresh test user for this test
    phone = generate_random_phone()
    password = "testpass1"
    new_password = "newpass123"
    
    register_payload = {
        "phone_number": phone,
        "password": password,
        "full_name": "Test User",
        "gender": "male",
        "country": "Syria",
        "city": "Damascus"
    }
    
    register_response = requests.post(f"{BASE_URL}/auth/register", json=register_payload)
    if register_response.status_code not in [200, 201]:
        return [f"❌ Failed to create test user: {register_response.status_code}"]
    
    token = register_response.json().get("access_token")
    headers = {"Authorization": f"Bearer {token}"}
    
    # Test unauthenticated change password
    response1 = requests.post(f"{BASE_URL}/auth/change-password", 
                             json={"old_password": password, "new_password": new_password})
    if response1.status_code == 401:
        results.append("✅ Unauthenticated change password: PASS")
    else:
        results.append(f"❌ Unauthenticated change password: FAIL - Status {response1.status_code}")
    
    # Test wrong old password
    response2 = requests.post(f"{BASE_URL}/auth/change-password", 
                             json={"old_password": "wrongpass", "new_password": new_password},
                             headers=headers)
    if response2.status_code == 400 and "Current password is incorrect" in response2.text:
        results.append("✅ Wrong old password: PASS")
    else:
        results.append(f"❌ Wrong old password: FAIL - Status {response2.status_code}")
    
    # Test weak new password
    response3 = requests.post(f"{BASE_URL}/auth/change-password", 
                             json={"old_password": password, "new_password": "abcd"},
                             headers=headers)
    if response3.status_code == 422:
        results.append("✅ Weak new password: PASS")
    else:
        results.append(f"❌ Weak new password: FAIL - Status {response3.status_code}")
    
    # Test same old and new password
    response4 = requests.post(f"{BASE_URL}/auth/change-password", 
                             json={"old_password": password, "new_password": password},
                             headers=headers)
    if response4.status_code == 400 and "must be different" in response4.text:
        results.append("✅ Same old and new password: PASS")
    else:
        results.append(f"❌ Same old and new password: FAIL - Status {response4.status_code}")
    
    # Test valid password change
    response5 = requests.post(f"{BASE_URL}/auth/change-password", 
                             json={"old_password": password, "new_password": new_password},
                             headers=headers)
    if response5.status_code == 200 and "Password changed successfully" in response5.text:
        results.append("✅ Valid password change: PASS")
        
        # Test login with new password
        login_payload = {"phone_number": phone, "password": new_password}
        login_response = requests.post(f"{BASE_URL}/auth/login", json=login_payload)
        
        if login_response.status_code == 200:
            results.append("✅ Login with new password: PASS")
        else:
            results.append(f"❌ Login with new password: FAIL - Status {login_response.status_code}")
        
        # Test login with old password (should fail)
        old_login_payload = {"phone_number": phone, "password": password}
        old_login_response = requests.post(f"{BASE_URL}/auth/login", json=old_login_payload)
        
        if old_login_response.status_code == 401:
            results.append("✅ Login with old password fails: PASS")
        else:
            results.append(f"❌ Login with old password should fail: Status {old_login_response.status_code}")
    else:
        results.append(f"❌ Valid password change: FAIL - Status {response5.status_code}")
    
    return results

def test_must_change_password_enforcement():
    """Test 3: must_change_password enforcement"""
    print("\n=== TEST 3: must_change_password Enforcement ===")
    
    results = []
    
    # Create a fresh test user
    phone = generate_random_phone()
    password = "testpass1"
    
    register_payload = {
        "phone_number": phone,
        "password": password,
        "full_name": "Test User",
        "gender": "male",
        "country": "Syria",
        "city": "Damascus"
    }
    
    register_response = requests.post(f"{BASE_URL}/auth/register", json=register_payload)
    if register_response.status_code not in [200, 201]:
        return [f"❌ Failed to create test user: {register_response.status_code}"]
    
    token = register_response.json().get("access_token")
    headers = {"Authorization": f"Bearer {token}"}
    
    # Get user ID from profile
    profile_response = requests.get(f"{BASE_URL}/users/me", headers=headers)
    if profile_response.status_code != 200:
        return [f"❌ Failed to get user profile: {profile_response.status_code}"]
    
    user_data = profile_response.json()
    user_id = user_data.get("id")
    
    # Manually update user in MongoDB to set must_change_password=true
    try:
        client = get_mongo_client()
        db_conn = client[DB_NAME]
        users_collection = db_conn.users
        
        update_result = users_collection.update_one(
            {"id": user_id},
            {"$set": {"must_change_password": True}}
        )
        
        if update_result.matched_count == 0:
            return [f"❌ Failed to find user with id {user_id}"]
        
        client.close()
        
    except Exception as e:
        return [f"❌ Database update failed: {str(e)}"]
    
    # Test that allowed endpoints still work
    me_response = requests.get(f"{BASE_URL}/users/me", headers=headers)
    if me_response.status_code == 200:
        results.append("✅ GET /api/users/me still works with must_change_password=true: PASS")
    else:
        results.append(f"❌ GET /api/users/me should work: Status {me_response.status_code}")
    
    # Test that protected endpoints are blocked
    favorites_response = requests.get(f"{BASE_URL}/favorites/my", headers=headers)
    if favorites_response.status_code == 403 and "You must change your password" in favorites_response.text:
        results.append("✅ GET /api/favorites/my blocked with must_change_password: PASS")
    else:
        results.append(f"❌ GET /api/favorites/my should be blocked: Status {favorites_response.status_code}")
    
    # Change password to clear the flag
    new_password = "newpass123"
    change_payload = {"old_password": password, "new_password": new_password}
    change_response = requests.post(f"{BASE_URL}/auth/change-password", 
                                  json=change_payload, 
                                  headers=headers)
    
    if change_response.status_code == 200:
        results.append("✅ Password change successful: PASS")
        
        # Test that protected endpoints now work
        time.sleep(1)  # Brief delay
        favorites_response2 = requests.get(f"{BASE_URL}/favorites/my", headers=headers)
        if favorites_response2.status_code == 200:
            results.append("✅ GET /api/favorites/my works after password change: PASS")
        else:
            results.append(f"❌ GET /api/favorites/my should work after password change: Status {favorites_response2.status_code}")
    else:
        results.append(f"❌ Password change failed: Status {change_response.status_code}")
    
    return results

def test_seed_password_rotation():
    """Test 4: Seed password rotation"""
    print("\n=== TEST 4: Seed Password Rotation ===")
    
    results = []
    
    # First, wipe all barbershops
    try:
        client = get_mongo_client()
        db_conn = client[DB_NAME]
        barbershops_collection = db_conn.barbershops
        
        delete_result = barbershops_collection.delete_many({})
        results.append(f"✅ Wiped {delete_result.deleted_count} existing barbershops")
        
        client.close()
        
    except Exception as e:
        return [f"❌ Database wipe failed: {str(e)}"]
    
    # Call POST /api/seed with X-Seed-Token
    headers = {"X-Seed-Token": SEED_TOKEN}
    seed_response = requests.post(f"{BASE_URL}/seed", headers=headers)
    
    if seed_response.status_code != 200:
        return [f"❌ Seed failed: Status {seed_response.status_code}, Response: {seed_response.text}"]
    
    seed_data = seed_response.json()
    
    # Check response structure
    if "shops" not in seed_data:
        return [f"❌ Seed response missing 'shops' array"]
    
    shops = seed_data["shops"]
    if len(shops) == 0:
        return [f"❌ No shops in seed response"]
    
    results.append(f"✅ Seed created {len(shops)} shops")
    
    # Check each shop has a password field with at least 12 characters and at least one digit
    passwords = []
    for i, shop in enumerate(shops):
        if "password" not in shop:
            results.append(f"❌ Shop {i} missing password field")
            continue
            
        password = shop["password"]
        if len(password) < 12:
            results.append(f"❌ Shop {i} password too short: {len(password)} chars")
            continue
            
        if not any(c.isdigit() for c in password):
            results.append(f"❌ Shop {i} password missing digit")
            continue
            
        passwords.append(password)
    
    if len(passwords) == len(shops):
        results.append("✅ All shop passwords valid (12+ chars with digit)")
    
    # Check passwords are different
    unique_passwords = set(passwords)
    if len(unique_passwords) == len(passwords):
        results.append("✅ All shop passwords are unique")
    else:
        results.append(f"❌ Duplicate passwords found: {len(passwords)} total, {len(unique_passwords)} unique")
    
    # Check for test_credentials note
    if "test_credentials" in seed_data and "salon_passwords_note" in seed_data["test_credentials"]:
        results.append("✅ test_credentials.salon_passwords_note present")
    else:
        results.append("❌ test_credentials.salon_passwords_note missing")
    
    # Test login with one of the new passwords
    if shops:
        test_shop = shops[0]
        login_payload = {
            "phone_number": test_shop.get("phone_number", test_shop.get("phone")),
            "password": test_shop.get("password")
        }
        
        login_response = requests.post(f"{BASE_URL}/auth/login", json=login_payload)
        if login_response.status_code == 200:
            results.append("✅ Login with new seeded password: PASS")
        else:
            results.append(f"❌ Login with new seeded password: FAIL - Status {login_response.status_code}")
        
        # Test login with legacy password should fail
        legacy_login_payload = {
            "phone_number": test_shop.get("phone_number", test_shop.get("phone")),
            "password": "salon123"
        }
        
        legacy_response = requests.post(f"{BASE_URL}/auth/login", json=legacy_login_payload)
        if legacy_response.status_code == 401:
            results.append("✅ Login with legacy 'salon123' fails: PASS")
        else:
            results.append(f"❌ Login with legacy 'salon123' should fail: Status {legacy_response.status_code}")
    
    return results

def test_admin_forced_rotation():
    """Test 6: Admin forced rotation at boot (regression check)"""
    print("\n=== TEST 6: Admin Forced Rotation Regression ===")
    
    results = []
    
    # Test login with new admin password
    login_payload = {
        "phone_number": ADMIN_PHONE,
        "password": ADMIN_PASSWORD
    }
    
    login_response = requests.post(f"{BASE_URL}/auth/login", json=login_payload)
    if login_response.status_code == 200:
        login_data = login_response.json()
        if login_data.get("user", {}).get("must_change_password") == False:
            results.append("✅ Admin login with NewStrong2026!xYz successful, must_change_password=False: PASS")
        else:
            results.append(f"❌ Admin login successful but must_change_password not False")
    else:
        results.append(f"❌ Admin login with NewStrong2026!xYz failed: Status {login_response.status_code}")
    
    # Test login with old admin password should fail
    old_login_payload = {
        "phone_number": ADMIN_PHONE,
        "password": "admin123"
    }
    
    old_login_response = requests.post(f"{BASE_URL}/auth/login", json=old_login_payload)
    if old_login_response.status_code == 401:
        results.append("✅ Admin login with old 'admin123' fails: PASS")
    else:
        results.append(f"❌ Admin login with old 'admin123' should fail: Status {old_login_response.status_code}")
    
    return results

def test_regression_checks():
    """Test 7: Regression checks"""
    print("\n=== TEST 7: Regression Checks ===")
    
    results = []
    
    # Test basic endpoints
    endpoints = [
        ("/health", 200),
        ("/config/public", 200),
        ("/products/featured", 200),
        ("/barbers", 200),
        ("/ranking/tiers", 200)
    ]
    
    for endpoint, expected_status in endpoints:
        response = requests.get(f"{BASE_URL}{endpoint}")
        if response.status_code == expected_status:
            results.append(f"✅ GET {endpoint}: PASS")
        else:
            results.append(f"❌ GET {endpoint}: FAIL - Expected {expected_status}, got {response.status_code}")
    
    # Check products/featured has count >= 10
    products_response = requests.get(f"{BASE_URL}/products/featured")
    if products_response.status_code == 200:
        products_data = products_response.json()
        if isinstance(products_data, list) and len(products_data) >= 10:
            results.append(f"✅ GET /products/featured count >= 10: PASS ({len(products_data)} products)")
        else:
            results.append(f"❌ GET /products/featured count < 10: {len(products_data) if isinstance(products_data, list) else 'Not a list'}")
    
    # Test X-Seed-Token with wrong value
    wrong_headers = {"X-Seed-Token": "wrong_token"}
    seed_response = requests.post(f"{BASE_URL}/seed", headers=wrong_headers)
    if seed_response.status_code == 403:
        results.append("✅ Seed with wrong token returns 403: PASS")
    else:
        results.append(f"❌ Seed with wrong token should return 403: Status {seed_response.status_code}")
    
    return results

def main():
    """Run all security tests"""
    print("🔒 BARBER HUB v3.6.1 Security Fixes Verification - Clean Version")
    print("=" * 70)
    
    all_results = []
    
    # Run all tests
    test_functions = [
        test_password_policy,
        test_password_change_endpoint,
        test_must_change_password_enforcement,
        test_seed_password_rotation,
        test_admin_forced_rotation,
        test_regression_checks
    ]
    
    for test_func in test_functions:
        try:
            results = test_func()
            all_results.extend(results)
            for result in results:
                print(result)
        except Exception as e:
            error_msg = f"❌ {test_func.__name__} failed with exception: {str(e)}"
            print(error_msg)
            all_results.append(error_msg)
    
    # Summary
    print("\n" + "=" * 70)
    print("📊 SUMMARY")
    print("=" * 70)
    
    passed = len([r for r in all_results if r.startswith("✅")])
    failed = len([r for r in all_results if r.startswith("❌")])
    total = passed + failed
    
    print(f"Total Tests: {total}")
    print(f"Passed: {passed}")
    print(f"Failed: {failed}")
    print(f"Success Rate: {(passed/total*100):.1f}%" if total > 0 else "0%")
    
    if failed > 0:
        print("\n❌ FAILED TESTS:")
        for result in all_results:
            if result.startswith("❌"):
                print(f"  {result}")
    
    print("\n🎉 Testing Complete!")

if __name__ == "__main__":
    main()