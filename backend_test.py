#!/usr/bin/env python3
"""
BARBER HUB Backend API Testing Suite
Tests all backend endpoints comprehensively
"""

import requests
import json
import uuid
from datetime import datetime, timedelta
import sys

# Configuration
BASE_URL = "https://tech-state-doc.preview.emergentagent.com/api"
ADMIN_PHONE = "admin"
ADMIN_PASSWORD = "admin123"

# Test data
TEST_USER_PHONE = f"+963{uuid.uuid4().hex[:8]}"
TEST_USER_PASSWORD = "test123"
TEST_USER_NAME = "أحمد محمد"

TEST_BARBER_PHONE = f"+963{uuid.uuid4().hex[:8]}"
TEST_BARBER_PASSWORD = "test123"
TEST_BARBER_NAME = "محمد الحلاق"
TEST_SHOP_NAME = "صالون الأناقة"

# Global variables to store tokens and IDs
admin_token = None
user_token = None
barber_token = None
user_id = None
barber_id = None
booking_id = None
review_id = None

def log_test(test_name, status, details=""):
    """Log test results"""
    status_symbol = "✅" if status == "PASS" else "❌"
    print(f"{status_symbol} {test_name}: {details}")

def make_request(method, endpoint, data=None, token=None, params=None):
    """Make HTTP request with proper headers"""
    url = f"{BASE_URL}{endpoint}"
    headers = {"Content-Type": "application/json"}
    
    if token:
        headers["Authorization"] = f"Bearer {token}"
    
    try:
        if method == "GET":
            response = requests.get(url, headers=headers, params=params, timeout=30)
        elif method == "POST":
            response = requests.post(url, headers=headers, json=data, timeout=30)
        elif method == "PUT":
            response = requests.put(url, headers=headers, json=data, params=params, timeout=30)
        elif method == "DELETE":
            response = requests.delete(url, headers=headers, timeout=30)
        else:
            raise ValueError(f"Unsupported method: {method}")
        
        return response
    except requests.exceptions.RequestException as e:
        print(f"❌ Request failed for {method} {endpoint}: {str(e)}")
        return None

def test_auth_user_registration():
    """Test user registration"""
    global user_token, user_id
    
    data = {
        "phone_number": TEST_USER_PHONE,
        "password": TEST_USER_PASSWORD,
        "full_name": TEST_USER_NAME,
        "gender": "male",
        "country": "SY",
        "city": "الحسكة"
    }
    
    response = make_request("POST", "/auth/register", data)
    
    if response and response.status_code == 200:
        result = response.json()
        if "access_token" in result and result.get("user_type") == "user":
            user_token = result["access_token"]
            user_id = result["user"]["id"]
            log_test("Auth - User Registration", "PASS", f"User registered with ID: {user_id}")
            return True
        else:
            log_test("Auth - User Registration", "FAIL", f"Invalid response format: {result}")
            return False
    else:
        status_code = response.status_code if response else "No response"
        error_msg = response.text if response else "Request failed"
        log_test("Auth - User Registration", "FAIL", f"Status: {status_code}, Error: {error_msg}")
        return False

def test_auth_user_login():
    """Test user login"""
    global user_token
    
    data = {
        "phone_number": TEST_USER_PHONE,
        "password": TEST_USER_PASSWORD
    }
    
    response = make_request("POST", "/auth/login", data)
    
    if response and response.status_code == 200:
        result = response.json()
        if "access_token" in result and result.get("user_type") == "user":
            user_token = result["access_token"]
            log_test("Auth - User Login", "PASS", "User login successful")
            return True
        else:
            log_test("Auth - User Login", "FAIL", f"Invalid response format: {result}")
            return False
    else:
        status_code = response.status_code if response else "No response"
        error_msg = response.text if response else "Request failed"
        log_test("Auth - User Login", "FAIL", f"Status: {status_code}, Error: {error_msg}")
        return False

def test_auth_barbershop_registration():
    """Test barbershop registration"""
    global barber_token, barber_id
    
    data = {
        "owner_name": TEST_BARBER_NAME,
        "shop_name": TEST_SHOP_NAME,
        "shop_type": "male",
        "phone_number": TEST_BARBER_PHONE,
        "password": TEST_BARBER_PASSWORD,
        "country": "SY",
        "city": "الحسكة"
    }
    
    response = make_request("POST", "/auth/register-barbershop", data)
    
    if response and response.status_code == 200:
        result = response.json()
        if "access_token" in result and result.get("user_type") == "barbershop":
            barber_token = result["access_token"]
            barber_id = result["user"]["id"]
            log_test("Auth - Barbershop Registration", "PASS", f"Barbershop registered with ID: {barber_id}")
            return True
        else:
            log_test("Auth - Barbershop Registration", "FAIL", f"Invalid response format: {result}")
            return False
    else:
        status_code = response.status_code if response else "No response"
        error_msg = response.text if response else "Request failed"
        log_test("Auth - Barbershop Registration", "FAIL", f"Status: {status_code}, Error: {error_msg}")
        return False

def test_auth_admin_login():
    """Test admin login"""
    global admin_token
    
    data = {
        "phone_number": ADMIN_PHONE,
        "password": ADMIN_PASSWORD
    }
    
    response = make_request("POST", "/auth/login", data)
    
    if response and response.status_code == 200:
        result = response.json()
        if "access_token" in result and result.get("user_type") == "admin":
            admin_token = result["access_token"]
            log_test("Auth - Admin Login", "PASS", "Admin login successful")
            return True
        else:
            log_test("Auth - Admin Login", "FAIL", f"Invalid response format: {result}")
            return False
    else:
        status_code = response.status_code if response else "No response"
        error_msg = response.text if response else "Request failed"
        log_test("Auth - Admin Login", "FAIL", f"Status: {status_code}, Error: {error_msg}")
        return False

def test_barber_profile_get_by_id():
    """Test getting barber profile by ID"""
    if not barber_id:
        log_test("Barber Profile - Get by ID", "FAIL", "No barber ID available")
        return False
    
    response = make_request("GET", f"/barbers/{barber_id}")
    
    if response and response.status_code == 200:
        result = response.json()
        if "id" in result and "salon_name" in result:
            log_test("Barber Profile - Get by ID", "PASS", f"Retrieved profile for barber: {result.get('salon_name', 'N/A')}")
            return True
        else:
            log_test("Barber Profile - Get by ID", "FAIL", f"Invalid response format: {result}")
            return False
    else:
        status_code = response.status_code if response else "No response"
        error_msg = response.text if response else "Request failed"
        log_test("Barber Profile - Get by ID", "FAIL", f"Status: {status_code}, Error: {error_msg}")
        return False

def test_barber_profile_my_profile():
    """Test getting own barber profile"""
    if not barber_token:
        log_test("Barber Profile - My Profile", "FAIL", "No barber token available")
        return False
    
    response = make_request("GET", "/barbers/profile/me", token=barber_token)
    
    if response and response.status_code == 200:
        result = response.json()
        if "id" in result and "salon_name" in result:
            log_test("Barber Profile - My Profile", "PASS", f"Retrieved own profile: {result.get('salon_name', 'N/A')}")
            return True
        else:
            log_test("Barber Profile - My Profile", "FAIL", f"Invalid response format: {result}")
            return False
    else:
        status_code = response.status_code if response else "No response"
        error_msg = response.text if response else "Request failed"
        log_test("Barber Profile - My Profile", "FAIL", f"Status: {status_code}, Error: {error_msg}")
        return False

def test_barber_profile_create_update():
    """Test creating/updating barber profile"""
    if not barber_token:
        log_test("Barber Profile - Create/Update", "FAIL", "No barber token available")
        return False
    
    data = {
        "salon_name": "صالون الأناقة المحدث",
        "description": "أفضل صالون في المدينة",
        "services": [
            {"name": "قص شعر", "name_ar": "قص شعر", "price": 25, "duration_minutes": 30},
            {"name": "حلاقة ذقن", "name_ar": "حلاقة ذقن", "price": 15, "duration_minutes": 20}
        ],
        "working_hours": {
            "sunday": {"start": "09:00", "end": "21:00"},
            "monday": {"start": "09:00", "end": "21:00"},
            "tuesday": {"start": "09:00", "end": "21:00"},
            "wednesday": {"start": "09:00", "end": "21:00"},
            "thursday": {"start": "09:00", "end": "21:00"},
            "friday": {"start": "09:00", "end": "21:00"},
            "saturday": {"start": "09:00", "end": "21:00"}
        }
    }
    
    response = make_request("POST", "/barbers/profile", data, token=barber_token)
    
    if response and response.status_code == 200:
        result = response.json()
        if "id" in result and "services" in result:
            log_test("Barber Profile - Create/Update", "PASS", f"Profile updated with {len(result.get('services', []))} services")
            return True
        else:
            log_test("Barber Profile - Create/Update", "FAIL", f"Invalid response format: {result}")
            return False
    else:
        status_code = response.status_code if response else "No response"
        error_msg = response.text if response else "Request failed"
        log_test("Barber Profile - Create/Update", "FAIL", f"Status: {status_code}, Error: {error_msg}")
        return False

def test_top_barbers():
    """Test getting top barbers"""
    response = make_request("GET", "/barbers/top/male")
    
    if response and response.status_code == 200:
        result = response.json()
        if isinstance(result, list):
            log_test("Top Barbers", "PASS", f"Retrieved {len(result)} top barbers")
            return True
        else:
            log_test("Top Barbers", "FAIL", f"Expected list, got: {type(result)}")
            return False
    else:
        status_code = response.status_code if response else "No response"
        error_msg = response.text if response else "Request failed"
        log_test("Top Barbers", "FAIL", f"Status: {status_code}, Error: {error_msg}")
        return False

def test_booking_create():
    """Test creating a booking"""
    global booking_id
    
    if not barber_id or not user_token:
        log_test("Booking System - Create", "FAIL", "Missing barber ID or user token")
        return False
    
    tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
    
    data = {
        "barber_id": barber_id,
        "date": tomorrow,
        "time": "14:00",
        "customer_phone": TEST_USER_PHONE,
        "customer_name": TEST_USER_NAME,
        "service_ids": ["قص شعر"]
    }
    
    response = make_request("POST", "/bookings", data, token=user_token)
    
    if response and response.status_code == 200:
        result = response.json()
        if "id" in result:
            booking_id = result["id"]
            log_test("Booking System - Create", "PASS", f"Booking created with ID: {booking_id}")
            return True
        else:
            log_test("Booking System - Create", "FAIL", f"Invalid response format: {result}")
            return False
    else:
        status_code = response.status_code if response else "No response"
        error_msg = response.text if response else "Request failed"
        log_test("Booking System - Create", "FAIL", f"Status: {status_code}, Error: {error_msg}")
        return False

def test_booking_my_bookings():
    """Test getting my bookings"""
    if not user_token:
        log_test("Booking System - My Bookings", "FAIL", "No user token available")
        return False
    
    response = make_request("GET", "/bookings/my", token=user_token)
    
    if response and response.status_code == 200:
        result = response.json()
        if isinstance(result, list):
            log_test("Booking System - My Bookings", "PASS", f"Retrieved {len(result)} bookings")
            return True
        else:
            log_test("Booking System - My Bookings", "FAIL", f"Expected list, got: {type(result)}")
            return False
    else:
        status_code = response.status_code if response else "No response"
        error_msg = response.text if response else "Request failed"
        log_test("Booking System - My Bookings", "FAIL", f"Status: {status_code}, Error: {error_msg}")
        return False

def test_booking_schedule():
    """Test getting barber schedule"""
    if not barber_id:
        log_test("Booking Schedule", "FAIL", "No barber ID available")
        return False
    
    tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
    params = {"date": tomorrow}
    
    response = make_request("GET", f"/bookings/barber/{barber_id}/schedule", params=params)
    
    if response and response.status_code == 200:
        result = response.json()
        if "date" in result and "booked_times" in result:
            log_test("Booking Schedule", "PASS", f"Retrieved schedule for {result['date']} with {len(result['booked_times'])} booked times")
            return True
        else:
            log_test("Booking Schedule", "FAIL", f"Invalid response format: {result}")
            return False
    else:
        status_code = response.status_code if response else "No response"
        error_msg = response.text if response else "Request failed"
        log_test("Booking Schedule", "FAIL", f"Status: {status_code}, Error: {error_msg}")
        return False

def test_booking_status_update():
    """Test updating booking status"""
    if not booking_id or not barber_token:
        log_test("Booking Status Update", "FAIL", "Missing booking ID or barber token")
        return False
    
    params = {"status": "confirmed"}
    response = make_request("PUT", f"/bookings/{booking_id}/status", params=params, token=barber_token)
    
    if response and response.status_code == 200:
        result = response.json()
        if "message" in result:
            log_test("Booking Status Update", "PASS", f"Status updated: {result['message']}")
            return True
        else:
            log_test("Booking Status Update", "FAIL", f"Invalid response format: {result}")
            return False
    else:
        status_code = response.status_code if response else "No response"
        error_msg = response.text if response else "Request failed"
        log_test("Booking Status Update", "FAIL", f"Status: {status_code}, Error: {error_msg}")
        return False

def test_booking_complete():
    """Test completing a booking (required for reviews)"""
    if not booking_id or not barber_token:
        log_test("Booking Complete", "FAIL", "Missing booking ID or barber token")
        return False
    
    params = {"status": "completed"}
    response = make_request("PUT", f"/bookings/{booking_id}/status", params=params, token=barber_token)
    
    if response and response.status_code == 200:
        result = response.json()
        if "message" in result:
            log_test("Booking Complete", "PASS", f"Booking completed: {result['message']}")
            return True
        else:
            log_test("Booking Complete", "FAIL", f"Invalid response format: {result}")
            return False
    else:
        status_code = response.status_code if response else "No response"
        error_msg = response.text if response else "Request failed"
        log_test("Booking Complete", "FAIL", f"Status: {status_code}, Error: {error_msg}")
        return False

def test_reviews_create():
    """Test creating a review"""
    global review_id
    
    if not booking_id or not barber_id or not user_token:
        log_test("Reviews System - Create", "FAIL", "Missing booking ID, barber ID, or user token")
        return False
    
    data = {
        "booking_id": booking_id,
        "barber_id": barber_id,
        "rating": 5,
        "comment": "خدمة ممتازة وحلاقة رائعة!"
    }
    
    response = make_request("POST", "/reviews", data, token=user_token)
    
    if response and response.status_code == 200:
        result = response.json()
        if "id" in result:
            review_id = result["id"]
            log_test("Reviews System - Create", "PASS", f"Review created with ID: {review_id}")
            return True
        else:
            log_test("Reviews System - Create", "FAIL", f"Invalid response format: {result}")
            return False
    else:
        status_code = response.status_code if response else "No response"
        error_msg = response.text if response else "Request failed"
        log_test("Reviews System - Create", "FAIL", f"Status: {status_code}, Error: {error_msg}")
        return False

def test_reviews_get():
    """Test getting barber reviews"""
    if not barber_id:
        log_test("Reviews System - Get", "FAIL", "No barber ID available")
        return False
    
    response = make_request("GET", f"/reviews/barber/{barber_id}")
    
    if response and response.status_code == 200:
        result = response.json()
        if isinstance(result, list):
            log_test("Reviews System - Get", "PASS", f"Retrieved {len(result)} reviews")
            return True
        else:
            log_test("Reviews System - Get", "FAIL", f"Expected list, got: {type(result)}")
            return False
    else:
        status_code = response.status_code if response else "No response"
        error_msg = response.text if response else "Request failed"
        log_test("Reviews System - Get", "FAIL", f"Status: {status_code}, Error: {error_msg}")
        return False

def test_admin_stats():
    """Test admin stats"""
    if not admin_token:
        log_test("Admin Dashboard - Stats", "FAIL", "No admin token available")
        return False
    
    response = make_request("GET", "/admin/stats", token=admin_token)
    
    if response and response.status_code == 200:
        result = response.json()
        if "total_users" in result and "total_barbershops" in result:
            log_test("Admin Dashboard - Stats", "PASS", f"Stats: {result['total_users']} users, {result['total_barbershops']} barbershops")
            return True
        else:
            log_test("Admin Dashboard - Stats", "FAIL", f"Invalid response format: {result}")
            return False
    else:
        status_code = response.status_code if response else "No response"
        error_msg = response.text if response else "Request failed"
        log_test("Admin Dashboard - Stats", "FAIL", f"Status: {status_code}, Error: {error_msg}")
        return False

def test_admin_users():
    """Test admin users list"""
    if not admin_token:
        log_test("Admin Dashboard - Users", "FAIL", "No admin token available")
        return False
    
    response = make_request("GET", "/admin/users", token=admin_token)
    
    if response and response.status_code == 200:
        result = response.json()
        if isinstance(result, list):
            log_test("Admin Dashboard - Users", "PASS", f"Retrieved {len(result)} users")
            return True
        else:
            log_test("Admin Dashboard - Users", "FAIL", f"Expected list, got: {type(result)}")
            return False
    else:
        status_code = response.status_code if response else "No response"
        error_msg = response.text if response else "Request failed"
        log_test("Admin Dashboard - Users", "FAIL", f"Status: {status_code}, Error: {error_msg}")
        return False

def test_admin_subscriptions():
    """Test admin subscriptions"""
    if not admin_token:
        log_test("Admin Dashboard - Subscriptions", "FAIL", "No admin token available")
        return False
    
    response = make_request("GET", "/admin/subscriptions", token=admin_token)
    
    if response and response.status_code == 200:
        result = response.json()
        if isinstance(result, list):
            log_test("Admin Dashboard - Subscriptions", "PASS", f"Retrieved {len(result)} subscriptions")
            return True
        else:
            log_test("Admin Dashboard - Subscriptions", "FAIL", f"Expected list, got: {type(result)}")
            return False
    else:
        status_code = response.status_code if response else "No response"
        error_msg = response.text if response else "Request failed"
        log_test("Admin Dashboard - Subscriptions", "FAIL", f"Status: {status_code}, Error: {error_msg}")
        return False

def test_admin_reports():
    """Test admin reports"""
    if not admin_token:
        log_test("Admin Dashboard - Reports", "FAIL", "No admin token available")
        return False
    
    response = make_request("GET", "/admin/reports", token=admin_token)
    
    if response and response.status_code == 200:
        result = response.json()
        if isinstance(result, list):
            log_test("Admin Dashboard - Reports", "PASS", f"Retrieved {len(result)} reports")
            return True
        else:
            log_test("Admin Dashboard - Reports", "FAIL", f"Expected list, got: {type(result)}")
            return False
    else:
        status_code = response.status_code if response else "No response"
        error_msg = response.text if response else "Request failed"
        log_test("Admin Dashboard - Reports", "FAIL", f"Status: {status_code}, Error: {error_msg}")
        return False

def test_subscription_create():
    """Test creating a subscription"""
    if not barber_token:
        log_test("Subscription System", "FAIL", "No barber token available")
        return False
    
    data = {
        "plan_type": "annual",
        "amount": 100.0,
        "payment_method": "bank_transfer"
    }
    
    response = make_request("POST", "/subscriptions", data, token=barber_token)
    
    if response and response.status_code == 200:
        result = response.json()
        if "id" in result and "status" in result:
            log_test("Subscription System", "PASS", f"Subscription created with status: {result['status']}")
            return True
        else:
            log_test("Subscription System", "FAIL", f"Invalid response format: {result}")
            return False
    else:
        status_code = response.status_code if response else "No response"
        error_msg = response.text if response else "Request failed"
        log_test("Subscription System", "FAIL", f"Status: {status_code}, Error: {error_msg}")
        return False

def test_locations_countries():
    """Test getting countries list"""
    response = make_request("GET", "/locations/countries")
    
    if response and response.status_code == 200:
        result = response.json()
        if "countries" in result and isinstance(result["countries"], list):
            log_test("Location API - Countries", "PASS", f"Retrieved {len(result['countries'])} countries")
            return True
        else:
            log_test("Location API - Countries", "FAIL", f"Invalid response format: {result}")
            return False
    else:
        status_code = response.status_code if response else "No response"
        error_msg = response.text if response else "Request failed"
        log_test("Location API - Countries", "FAIL", f"Status: {status_code}, Error: {error_msg}")
        return False

def test_locations_cities():
    """Test getting cities for Syria"""
    response = make_request("GET", "/locations/cities/SY")
    
    if response and response.status_code == 200:
        result = response.json()
        if "cities" in result and isinstance(result["cities"], list):
            log_test("Location API - Cities", "PASS", f"Retrieved {len(result['cities'])} cities for Syria")
            return True
        else:
            log_test("Location API - Cities", "FAIL", f"Invalid response format: {result}")
            return False
    else:
        status_code = response.status_code if response else "No response"
        error_msg = response.text if response else "Request failed"
        log_test("Location API - Cities", "FAIL", f"Status: {status_code}, Error: {error_msg}")
        return False

def test_referral_system():
    """Test referral system"""
    if not user_token:
        log_test("Referral System", "FAIL", "No user token available")
        return False
    
    # Generate referral
    response = make_request("POST", "/referrals/generate", token=user_token)
    
    if response and response.status_code == 200:
        result = response.json()
        if "referral_code" in result:
            # Get my referrals
            response2 = make_request("GET", "/referrals/my", token=user_token)
            if response2 and response2.status_code == 200:
                result2 = response2.json()
                if "referral_code" in result2:
                    log_test("Referral System", "PASS", f"Referral code: {result2['referral_code']}")
                    return True
            
            log_test("Referral System", "FAIL", "Failed to get referral stats")
            return False
        else:
            log_test("Referral System", "FAIL", f"Invalid response format: {result}")
            return False
    else:
        status_code = response.status_code if response else "No response"
        error_msg = response.text if response else "Request failed"
        log_test("Referral System", "FAIL", f"Status: {status_code}, Error: {error_msg}")
        return False

def test_booking_cancel():
    """Test canceling a booking"""
    if not booking_id or not user_token:
        log_test("Booking Cancel", "FAIL", "Missing booking ID or user token")
        return False
    
    response = make_request("DELETE", f"/bookings/{booking_id}", token=user_token)
    
    if response and response.status_code == 200:
        result = response.json()
        if "message" in result:
            log_test("Booking Cancel", "PASS", f"Booking cancelled: {result['message']}")
            return True
        else:
            log_test("Booking Cancel", "FAIL", f"Invalid response format: {result}")
            return False
    else:
        status_code = response.status_code if response else "No response"
        error_msg = response.text if response else "Request failed"
        log_test("Booking Cancel", "FAIL", f"Status: {status_code}, Error: {error_msg}")
        return False

def run_all_tests():
    """Run all tests in sequence"""
    print("🚀 Starting BARBER HUB Backend API Tests")
    print("=" * 60)
    
    tests = [
        # Auth Flow
        ("Auth - User Registration", test_auth_user_registration),
        ("Auth - User Login", test_auth_user_login),
        ("Auth - Barbershop Registration", test_auth_barbershop_registration),
        ("Auth - Admin Login", test_auth_admin_login),
        
        # Barber Profile Flow
        ("Barber Profile - Get by ID", test_barber_profile_get_by_id),
        ("Barber Profile - My Profile", test_barber_profile_my_profile),
        ("Barber Profile - Create/Update", test_barber_profile_create_update),
        ("Top Barbers", test_top_barbers),
        
        # Booking Flow
        ("Booking System - Create", test_booking_create),
        ("Booking System - My Bookings", test_booking_my_bookings),
        ("Booking Schedule", test_booking_schedule),
        ("Booking Status Update", test_booking_status_update),
        ("Booking Complete", test_booking_complete),
        
        # Reviews Flow
        ("Reviews System - Create", test_reviews_create),
        ("Reviews System - Get", test_reviews_get),
        
        # Admin Flow
        ("Admin Dashboard - Stats", test_admin_stats),
        ("Admin Dashboard - Users", test_admin_users),
        ("Admin Dashboard - Subscriptions", test_admin_subscriptions),
        ("Admin Dashboard - Reports", test_admin_reports),
        
        # Other Systems
        ("Subscription System", test_subscription_create),
        ("Location API - Countries", test_locations_countries),
        ("Location API - Cities", test_locations_cities),
        ("Referral System", test_referral_system),
        
        # Cleanup
        ("Booking Cancel", test_booking_cancel),
    ]
    
    passed = 0
    failed = 0
    
    for test_name, test_func in tests:
        try:
            if test_func():
                passed += 1
            else:
                failed += 1
        except Exception as e:
            log_test(test_name, "FAIL", f"Exception: {str(e)}")
            failed += 1
        print()  # Add spacing between tests
    
    print("=" * 60)
    print(f"📊 Test Results: {passed} passed, {failed} failed")
    
    if failed == 0:
        print("🎉 All tests passed!")
        return True
    else:
        print(f"⚠️  {failed} tests failed")
        return False

if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)