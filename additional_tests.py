#!/usr/bin/env python3
"""
BARBER HUB v3.6.1 - Additional Security Tests
Testing specific scenarios that need more setup
"""

import requests
import json
import time
from datetime import datetime, timedelta

# Configuration
BASE_URL = "https://barber-finder-26.preview.emergentagent.com/api"
ADMIN_CREDS = {"phone_number": "admin", "password": "admin123"}
SALON_CREDS = {"phone_number": "07701234567", "password": "salon123"}

def make_request(method: str, endpoint: str, **kwargs):
    """Make HTTP request"""
    url = f"{BASE_URL}{endpoint}"
    if 'timeout' not in kwargs:
        kwargs['timeout'] = 30
    return requests.request(method, url, **kwargs)

def login_admin():
    """Login as admin and return token"""
    response = make_request("POST", "/auth/login", json=ADMIN_CREDS)
    if response.status_code == 200:
        return response.json().get("access_token")
    return None

def login_salon():
    """Login as salon and return token"""
    response = make_request("POST", "/auth/login", json=SALON_CREDS)
    if response.status_code == 200:
        return response.json().get("access_token")
    return None

def register_test_user():
    """Register a test user and return token"""
    import random
    phone = f"testuser{random.randint(100000, 999999)}"
    user_data = {
        "phone_number": phone,
        "full_name": "Test User",
        "password": "test123",
        "gender": "male",
        "country": "سوريا",
        "city": "دمشق"
    }
    response = make_request("POST", "/auth/register", json=user_data)
    if response.status_code == 200:
        return response.json().get("access_token"), phone
    return None, None

def test_booking_idor_comprehensive():
    """Test booking IDOR fix with proper setup"""
    print("🔍 Testing Booking IDOR Fix (Comprehensive)")
    
    # Step 1: Login as salon and get shop info
    salon_token = login_salon()
    if not salon_token:
        print("❌ Failed to login as salon")
        return False
    
    headers = {"Authorization": f"Bearer {salon_token}"}
    
    # Get salon's shop ID
    response = make_request("GET", "/barbers/profile/me", headers=headers)
    if response.status_code != 200:
        print("❌ Failed to get salon profile")
        return False
    
    shop_data = response.json()
    shop_id = shop_data.get("id")
    print(f"✅ Got salon shop ID: {shop_id}")
    
    # Step 2: Register a test user
    user_token, user_phone = register_test_user()
    if not user_token:
        print("❌ Failed to register test user")
        return False
    
    print(f"✅ Registered test user: {user_phone}")
    
    # Step 3: Create a booking as the user
    user_headers = {"Authorization": f"Bearer {user_token}"}
    tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
    
    booking_data = {
        "barbershop_id": shop_id,
        "booking_date": tomorrow,
        "start_time": "10:00",
        "customer_name": "Test User",
        "customer_phone": user_phone,
        "notes": "Test booking for IDOR test"
    }
    
    response = make_request("POST", "/bookings", json=booking_data, headers=user_headers)
    if response.status_code != 200:
        print(f"❌ Failed to create booking: {response.status_code} - {response.text}")
        return False
    
    booking = response.json()
    booking_id = booking.get("id")
    print(f"✅ Created booking: {booking_id}")
    
    # Step 4: Test IDOR scenarios
    test_results = []
    
    # Test 4.1: Anonymous access → 401
    response = make_request("GET", f"/bookings/{booking_id}")
    test_results.append({
        "test": "Anonymous access",
        "expected": 401,
        "actual": response.status_code,
        "passed": response.status_code == 401
    })
    
    # Test 4.2: Different user access → 403
    other_user_token, _ = register_test_user()
    if other_user_token:
        other_headers = {"Authorization": f"Bearer {other_user_token}"}
        response = make_request("GET", f"/bookings/{booking_id}", headers=other_headers)
        test_results.append({
            "test": "Different user access",
            "expected": 403,
            "actual": response.status_code,
            "passed": response.status_code == 403
        })
    
    # Test 4.3: Booking owner access → 200
    response = make_request("GET", f"/bookings/{booking_id}", headers=user_headers)
    test_results.append({
        "test": "Booking owner access",
        "expected": 200,
        "actual": response.status_code,
        "passed": response.status_code == 200
    })
    
    # Test 4.4: Salon owner access → 200
    response = make_request("GET", f"/bookings/{booking_id}", headers=headers)
    test_results.append({
        "test": "Salon owner access",
        "expected": 200,
        "actual": response.status_code,
        "passed": response.status_code == 200
    })
    
    # Test 4.5: Admin access → 200
    admin_token = login_admin()
    if admin_token:
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        response = make_request("GET", f"/bookings/{booking_id}", headers=admin_headers)
        test_results.append({
            "test": "Admin access",
            "expected": 200,
            "actual": response.status_code,
            "passed": response.status_code == 200
        })
    
    # Print results
    all_passed = True
    for result in test_results:
        status = "✅ PASS" if result["passed"] else "❌ FAIL"
        print(f"  {status} - {result['test']}: Expected {result['expected']}, Got {result['actual']}")
        if not result["passed"]:
            all_passed = False
    
    return all_passed

def test_area_regex_safety():
    """Test area parameter regex safety"""
    print("🔍 Testing Area Parameter Regex Safety")
    
    malicious_patterns = ["(((((", ".*+++++", "(?:(?:(?:(?:(?:"]
    
    all_passed = True
    for pattern in malicious_patterns:
        start_time = time.time()
        response = make_request("GET", f"/search/barbers?area={pattern}", timeout=10)
        elapsed = time.time() - start_time
        
        safe = response.status_code == 200 and elapsed < 5
        status = "✅ PASS" if safe else "❌ FAIL"
        print(f"  {status} - Area pattern '{pattern}': Status {response.status_code}, Time {elapsed:.2f}s")
        
        if not safe:
            all_passed = False
    
    return all_passed

def main():
    """Run additional security tests"""
    print("🔒 BARBER HUB v3.6.1 - Additional Security Tests")
    print("=" * 60)
    
    tests = [
        ("Booking IDOR Fix", test_booking_idor_comprehensive),
        ("Area Regex Safety", test_area_regex_safety),
    ]
    
    passed = 0
    total = len(tests)
    
    for test_name, test_func in tests:
        print(f"\n=== {test_name} ===")
        try:
            if test_func():
                passed += 1
                print(f"✅ {test_name} - PASSED")
            else:
                print(f"❌ {test_name} - FAILED")
        except Exception as e:
            print(f"❌ {test_name} - ERROR: {e}")
    
    print(f"\n📊 Additional Tests Summary: {passed}/{total} passed")
    return passed == total

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)