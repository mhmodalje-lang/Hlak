#!/usr/bin/env python3
"""
BARBER HUB v3.7.0 Admin Roles/Permissions System - Focused Test
Testing key endpoints without hitting rate limits
"""

import requests
import json
import time
import random
import string

# Configuration
BASE_URL = "https://barber-finder-26.preview.emergentagent.com/api"

def test_basic_endpoints():
    """Test basic endpoints that don't require authentication"""
    print("=== Testing Basic Endpoints ===")
    
    # Test health endpoint
    print("1. Testing health endpoint...")
    response = requests.get(f"{BASE_URL}/health")
    print(f"Health response: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Health endpoint working: {data}")
    else:
        print(f"❌ Health endpoint failed: {response.status_code}")
        return False
    
    # Test featured products
    print("2. Testing featured products...")
    response = requests.get(f"{BASE_URL}/products/featured")
    print(f"Featured products response: {response.status_code}")
    
    if response.status_code == 200:
        products = response.json()
        print(f"✅ Featured products working, count: {len(products)}")
    else:
        print(f"❌ Featured products failed: {response.status_code}")
        return False
    
    return True

def test_registration_endpoints():
    """Test registration endpoints to verify 405 fix"""
    print("\n=== Testing Registration Endpoints (405 Fix) ===")
    
    # Test user registration
    print("1. Testing user registration...")
    random_phone = "+9639992200" + ''.join(random.choices(string.digits, k=4))
    register_payload = {
        "phone_number": random_phone,
        "full_name": "Test User Registration",
        "password": "goodpass123",
        "gender": "male",
        "country": "سوريا",
        "city": "دمشق"
    }
    
    response = requests.post(f"{BASE_URL}/auth/register", json=register_payload)
    print(f"User registration response: {response.status_code}")
    
    if response.status_code in [200, 201]:
        print("✅ User registration successful")
    else:
        print(f"❌ User registration failed: {response.status_code} - {response.text}")
        return False
    
    # Test barbershop registration
    print("2. Testing barbershop registration...")
    random_shop_phone = "+9639992300" + ''.join(random.choices(string.digits, k=4))
    barbershop_payload = {
        "phone_number": random_shop_phone,
        "owner_name": "Test Barbershop Owner",
        "password": "shoppass123",
        "shop_name": "Test Barbershop",
        "shop_type": "male",
        "country": "سوريا",
        "city": "دمشق",
        "address": "Test Address"
    }
    
    response = requests.post(f"{BASE_URL}/auth/register-barbershop", json=barbershop_payload)
    print(f"Barbershop registration response: {response.status_code}")
    
    if response.status_code in [200, 201]:
        print("✅ Barbershop registration successful")
    else:
        print(f"❌ Barbershop registration failed: {response.status_code} - {response.text}")
        return False
    
    # Test old wrong path returns 405
    print("3. Testing old wrong path returns 405...")
    response = requests.post(f"{BASE_URL}/barbershops/register", json=barbershop_payload)
    print(f"Old path response: {response.status_code}")
    
    if response.status_code == 405:
        print("✅ Old wrong path correctly returns 405")
        return True
    else:
        print(f"❌ Old wrong path should return 405, got: {response.status_code}")
        return False

def test_admin_endpoints_without_auth():
    """Test admin endpoints without authentication to verify they return 401"""
    print("\n=== Testing Admin Endpoints Without Auth ===")
    
    endpoints = [
        "/admin/permissions/catalog",
        "/admin/me",
        "/admin/sub-admins"
    ]
    
    all_passed = True
    
    for endpoint in endpoints:
        print(f"Testing {endpoint}...")
        response = requests.get(f"{BASE_URL}{endpoint}")
        print(f"Response: {response.status_code}")
        
        if response.status_code == 401:
            print(f"✅ {endpoint} correctly returns 401 without auth")
        else:
            print(f"❌ {endpoint} should return 401, got: {response.status_code}")
            all_passed = False
    
    return all_passed

def test_non_admin_access():
    """Test admin endpoints with non-admin user to verify they return 403"""
    print("\n=== Testing Admin Endpoints With Non-Admin User ===")
    
    # Register a regular user
    random_phone = "+9639992400" + ''.join(random.choices(string.digits, k=4))
    register_payload = {
        "phone_number": random_phone,
        "full_name": "Regular User",
        "password": "userpass123",
        "gender": "male",
        "country": "سوريا",
        "city": "دمشق"
    }
    
    response = requests.post(f"{BASE_URL}/auth/register", json=register_payload)
    if response.status_code not in [200, 201]:
        print("❌ Failed to register test user")
        return False
    
    # Login as user
    login_payload = {"phone_number": random_phone, "password": "userpass123"}
    response = requests.post(f"{BASE_URL}/auth/login", json=login_payload)
    if response.status_code != 200:
        print("❌ Failed to login as test user")
        return False
    
    user_token = response.json()["access_token"]
    headers = {"Authorization": f"Bearer {user_token}"}
    
    # Test admin endpoints
    endpoints = [
        "/admin/permissions/catalog",
        "/admin/me",
        "/admin/sub-admins"
    ]
    
    all_passed = True
    
    for endpoint in endpoints:
        print(f"Testing {endpoint} with non-admin user...")
        response = requests.get(f"{BASE_URL}{endpoint}", headers=headers)
        print(f"Response: {response.status_code}")
        
        if response.status_code == 403:
            print(f"✅ {endpoint} correctly returns 403 for non-admin")
        else:
            print(f"❌ {endpoint} should return 403 for non-admin, got: {response.status_code}")
            all_passed = False
    
    return all_passed

def test_password_validation():
    """Test password validation on registration endpoints"""
    print("\n=== Testing Password Validation ===")
    
    # Test weak password on user registration
    print("1. Testing weak password on user registration...")
    random_phone = "+9639992500" + ''.join(random.choices(string.digits, k=4))
    weak_password_payload = {
        "phone_number": random_phone,
        "full_name": "Weak Password User",
        "password": "abc",  # Too weak
        "gender": "male",
        "country": "سوريا",
        "city": "دمشق"
    }
    
    response = requests.post(f"{BASE_URL}/auth/register", json=weak_password_payload)
    print(f"Weak password response: {response.status_code}")
    
    if response.status_code == 422:
        print("✅ User registration correctly rejected weak password")
    else:
        print(f"❌ Should reject weak password with 422, got: {response.status_code}")
        return False
    
    # Test weak password on barbershop registration
    print("2. Testing weak password on barbershop registration...")
    random_shop_phone = "+9639992600" + ''.join(random.choices(string.digits, k=4))
    weak_shop_payload = {
        "phone_number": random_shop_phone,
        "owner_name": "Weak Password Owner",
        "password": "123",  # Too weak
        "shop_name": "Weak Password Shop",
        "shop_type": "male",
        "country": "سوريا",
        "city": "دمشق",
        "address": "Test Address"
    }
    
    response = requests.post(f"{BASE_URL}/auth/register-barbershop", json=weak_shop_payload)
    print(f"Weak shop password response: {response.status_code}")
    
    if response.status_code == 422:
        print("✅ Barbershop registration correctly rejected weak password")
        return True
    else:
        print(f"❌ Should reject weak password with 422, got: {response.status_code}")
        return False

def run_focused_tests():
    """Run focused tests that don't require admin authentication"""
    print("🚀 BARBER HUB v3.7.0 Admin System - Focused Test Suite")
    print("=" * 80)
    
    tests = [
        ("Basic Endpoints", test_basic_endpoints),
        ("Registration Endpoints (405 Fix)", test_registration_endpoints),
        ("Admin Endpoints Without Auth", test_admin_endpoints_without_auth),
        ("Admin Endpoints With Non-Admin", test_non_admin_access),
        ("Password Validation", test_password_validation),
    ]
    
    results = []
    passed = 0
    total = len(tests)
    
    for test_name, test_func in tests:
        print(f"\n{'='*20} {test_name} {'='*20}")
        try:
            result = test_func()
            if result:
                print(f"✅ {test_name} PASSED")
                results.append((test_name, "PASSED", ""))
                passed += 1
            else:
                print(f"❌ {test_name} FAILED")
                results.append((test_name, "FAILED", "Test function returned False"))
        except Exception as e:
            print(f"💥 {test_name} ERROR: {str(e)}")
            results.append((test_name, "ERROR", str(e)))
    
    # Summary
    print(f"\n{'='*80}")
    print(f"🎯 FOCUSED TEST SUMMARY: {passed}/{total} tests passed ({passed/total*100:.1f}%)")
    print(f"{'='*80}")
    
    for test_name, status, error in results:
        status_emoji = "✅" if status == "PASSED" else "❌" if status == "FAILED" else "💥"
        print(f"{status_emoji} {test_name}: {status}")
        if error:
            print(f"   Error: {error}")
    
    return passed == total

if __name__ == "__main__":
    success = run_focused_tests()
    exit(0 if success else 1)