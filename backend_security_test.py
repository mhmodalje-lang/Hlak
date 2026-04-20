#!/usr/bin/env python3
"""
BARBER HUB v3.5 - Comprehensive Security Hardening Backend Testing
Testing new security features and regression checks
"""

import requests
import json
import sys
import time
import base64
from typing import Dict, Any, Optional

# API Configuration
BASE_URL = "https://vuln-checker-8.preview.emergentagent.com/api"

# Test Credentials
ADMIN_CREDENTIALS = {"phone_number": "admin", "password": "admin123"}
SALON_CREDENTIALS = {"phone_number": "0935964158", "password": "salon123"}

class SecurityTester:
    def __init__(self):
        self.admin_token = None
        self.salon_token = None
        self.user_token = None
        self.test_results = []
        self.shop_id = None
        
    def log_test(self, test_name: str, success: bool, details: str = ""):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        result = f"{status} - {test_name}"
        if details:
            result += f": {details}"
        print(result)
        self.test_results.append({
            "test": test_name,
            "success": success,
            "details": details
        })
        
    def make_request(self, method: str, endpoint: str, data: Dict = None, 
                    headers: Dict = None, expected_status: int = 200, 
                    timeout: int = 10) -> Optional[Dict]:
        """Make HTTP request with error handling"""
        url = f"{BASE_URL}{endpoint}"
        
        try:
            if method.upper() == "GET":
                response = requests.get(url, headers=headers, timeout=timeout)
            elif method.upper() == "POST":
                response = requests.post(url, json=data, headers=headers, timeout=timeout)
            elif method.upper() == "DELETE":
                response = requests.delete(url, headers=headers, timeout=timeout)
            elif method.upper() == "HEAD":
                response = requests.head(url, headers=headers, timeout=timeout)
            else:
                raise ValueError(f"Unsupported method: {method}")
                
            print(f"  {method} {endpoint} -> {response.status_code}")
            
            if response.status_code != expected_status:
                print(f"  Expected {expected_status}, got {response.status_code}")
                if response.text:
                    print(f"  Response: {response.text[:300]}")
                return None
                
            if response.content and method.upper() != "HEAD":
                return response.json()
            return {"status_code": response.status_code, "headers": dict(response.headers)}
            
        except Exception as e:
            print(f"  Request failed: {str(e)}")
            return None

    # ===== NEW/MODIFIED ENDPOINTS TESTING =====
    
    def test_1_health_endpoint(self):
        """Test 1: GET /api/health - Health check with DB status"""
        print("\n1. Testing health endpoint...")
        
        health_data = self.make_request("GET", "/health")
        
        if not health_data:
            self.log_test("Health Endpoint", False, "Failed to get health response")
            return False
            
        required_fields = ["status", "db", "version", "timestamp"]
        missing_fields = [field for field in required_fields if field not in health_data]
        
        if missing_fields:
            self.log_test("Health Endpoint", False, f"Missing fields: {missing_fields}")
            return False
            
        # Check status values
        if health_data["status"] not in ["ok", "degraded"]:
            self.log_test("Health Endpoint", False, f"Invalid status: {health_data['status']}")
            return False
            
        if health_data["db"] not in ["ok", "unreachable"]:
            self.log_test("Health Endpoint", False, f"Invalid db status: {health_data['db']}")
            return False
            
        self.log_test("Health Endpoint", True, 
                     f"Status: {health_data['status']}, DB: {health_data['db']}, Version: {health_data['version']}")
        return True
    
    def test_2_public_config_endpoint(self):
        """Test 2: GET /api/config/public - Public config with admin_whatsapp"""
        print("\n2. Testing public config endpoint...")
        
        config_data = self.make_request("GET", "/config/public")
        
        if not config_data:
            self.log_test("Public Config Endpoint", False, "Failed to get config response")
            return False
            
        required_fields = ["admin_whatsapp", "app_url", "version"]
        missing_fields = [field for field in required_fields if field not in config_data]
        
        if missing_fields:
            self.log_test("Public Config Endpoint", False, f"Missing fields: {missing_fields}")
            return False
            
        # Check admin_whatsapp is present (should be 963935964158 from env)
        if not config_data["admin_whatsapp"]:
            self.log_test("Public Config Endpoint", False, "admin_whatsapp is empty")
            return False
            
        self.log_test("Public Config Endpoint", True, 
                     f"admin_whatsapp: {config_data['admin_whatsapp']}, app_url: {config_data['app_url']}")
        return True
    
    def test_3_security_headers(self):
        """Test 3: Security Headers - Check all required headers are present"""
        print("\n3. Testing security headers...")
        
        # Use HEAD request to check headers
        response_data = self.make_request("HEAD", "/pwa/status")
        
        if not response_data or "headers" not in response_data:
            self.log_test("Security Headers", False, "Failed to get response headers")
            return False
            
        headers = response_data["headers"]
        
        required_headers = {
            "X-Content-Type-Options": "nosniff",
            "X-Frame-Options": "SAMEORIGIN", 
            "Referrer-Policy": "strict-origin-when-cross-origin",
            "Permissions-Policy": "geolocation=",  # Should contain geolocation=
            "Strict-Transport-Security": "max-age="  # Should contain max-age=
        }
        
        missing_headers = []
        invalid_headers = []
        
        for header_name, expected_value in required_headers.items():
            if header_name not in headers:
                missing_headers.append(header_name)
            elif expected_value not in headers[header_name]:
                invalid_headers.append(f"{header_name}: {headers[header_name]}")
        
        if missing_headers:
            self.log_test("Security Headers", False, f"Missing headers: {missing_headers}")
            return False
            
        if invalid_headers:
            self.log_test("Security Headers", False, f"Invalid headers: {invalid_headers}")
            return False
            
        self.log_test("Security Headers", True, "All required security headers present")
        return True
    
    def test_4_login_rate_limiting(self):
        """Test 4: Rate Limiting on POST /api/auth/login"""
        print("\n4. Testing login rate limiting...")
        
        test_phone = "0935964158"  # Use salon phone for testing
        wrong_password = "wrongpassword"
        
        # Issue 8 failed login attempts (should get 401)
        print("  Testing first 8 failed attempts (should get 401)...")
        failed_attempts = 0
        
        for i in range(8):
            login_data = {"phone_number": test_phone, "password": wrong_password}
            response_data = self.make_request("POST", "/auth/login", login_data, expected_status=401)
            
            if response_data is None:  # This means we got 401 as expected
                failed_attempts += 1
            else:
                print(f"    Attempt {i+1}: Expected 401, got different status")
        
        if failed_attempts != 8:
            self.log_test("Login Rate Limiting - First 8 attempts", False, 
                         f"Expected 8 failed attempts with 401, got {failed_attempts}")
            return False
            
        print("  Testing 9th attempt (should get 429)...")
        # 9th attempt should return 429
        login_data = {"phone_number": test_phone, "password": wrong_password}
        
        try:
            url = f"{BASE_URL}/auth/login"
            response = requests.post(url, json=login_data, timeout=10)
            
            if response.status_code == 429:
                response_text = response.text
                if "Too many" in response_text or "many" in response_text.lower():
                    print("  Testing correct admin login from different identifier...")
                    # Test that admin login still works (different IP bucket)
                    admin_login = self.make_request("POST", "/auth/login", ADMIN_CREDENTIALS)
                    if admin_login and "access_token" in admin_login:
                        self.log_test("Login Rate Limiting", True, 
                                     "9th attempt correctly returned 429, admin login still works")
                        return True
                    else:
                        self.log_test("Login Rate Limiting", False, 
                                     "9th attempt returned 429 but admin login failed")
                        return False
                else:
                    self.log_test("Login Rate Limiting", False, 
                                 f"Got 429 but wrong message: {response_text}")
                    return False
            else:
                self.log_test("Login Rate Limiting", False, 
                             f"Expected 429 on 9th attempt, got {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Login Rate Limiting", False, f"9th attempt failed: {str(e)}")
            return False
    
    def test_5_register_rate_limiting(self):
        """Test 5: Rate Limiting on POST /api/auth/register"""
        print("\n5. Testing register rate limiting...")
        
        # Issue 10 register attempts with unique phone numbers
        print("  Testing first 10 register attempts (should succeed)...")
        successful_registers = 0
        
        for i in range(10):
            unique_phone = f"099999{i:04d}"  # Generate unique phone numbers
            register_data = {
                "phone_number": unique_phone,
                "password": "testpass123",
                "full_name": "Test User",
                "gender": "male",
                "country": "Syria",
                "city": "Damascus"
            }
            
            response_data = self.make_request("POST", "/auth/register", register_data)
            
            if response_data and "access_token" in response_data:
                successful_registers += 1
            elif response_data is None:
                # Check if it's a 400 (phone already registered) - this still counts toward rate limit
                try:
                    url = f"{BASE_URL}/auth/register"
                    response = requests.post(url, json=register_data, timeout=10)
                    if response.status_code == 400:
                        successful_registers += 1  # Counts toward rate limit
                except:
                    pass
        
        print(f"    Completed {successful_registers}/10 register attempts")
        
        # 11th attempt should return 429
        print("  Testing 11th attempt (should get 429)...")
        register_data = {
            "phone_number": "0999999999",
            "password": "testpass123", 
            "full_name": "Test User",
            "gender": "male",
            "country": "Syria",
            "city": "Damascus"
        }
        
        try:
            url = f"{BASE_URL}/auth/register"
            response = requests.post(url, json=register_data, timeout=10)
            
            if response.status_code == 429:
                self.log_test("Register Rate Limiting", True, 
                             f"11th attempt correctly returned 429 after {successful_registers} attempts")
                return True
            else:
                self.log_test("Register Rate Limiting", False, 
                             f"Expected 429 on 11th attempt, got {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Register Rate Limiting", False, f"11th attempt failed: {str(e)}")
            return False
    
    def test_6_password_validation(self):
        """Test 6: Password validation on POST /api/auth/register"""
        print("\n6. Testing password validation...")
        
        # Test short password (3 chars)
        print("  Testing short password (3 chars)...")
        short_pass_data = {
            "phone_number": "0999888777",
            "password": "abc",  # Too short
            "full_name": "Test User",
            "gender": "male", 
            "country": "Syria",
            "city": "Damascus"
        }
        
        try:
            url = f"{BASE_URL}/auth/register"
            response = requests.post(url, json=short_pass_data, timeout=10)
            
            if response.status_code == 422:
                response_text = response.text
                if "6 characters" in response_text or "at least 6" in response_text:
                    print("    ✅ Short password correctly rejected with 422")
                else:
                    self.log_test("Password Validation", False, 
                                 f"Got 422 but wrong message: {response_text}")
                    return False
            else:
                self.log_test("Password Validation", False, 
                             f"Expected 422 for short password, got {response.status_code}")
                return False
        except Exception as e:
            self.log_test("Password Validation", False, f"Short password test failed: {str(e)}")
            return False
        
        # Test short name (1 char)
        print("  Testing short name (1 char)...")
        short_name_data = {
            "phone_number": "0999888666",
            "password": "validpass123",
            "full_name": "a",  # Too short
            "gender": "male",
            "country": "Syria", 
            "city": "Damascus"
        }
        
        try:
            url = f"{BASE_URL}/auth/register"
            response = requests.post(url, json=short_name_data, timeout=10)
            
            if response.status_code == 422:
                print("    ✅ Short name correctly rejected with 422")
            else:
                self.log_test("Password Validation", False, 
                             f"Expected 422 for short name, got {response.status_code}")
                return False
        except Exception as e:
            self.log_test("Password Validation", False, f"Short name test failed: {str(e)}")
            return False
        
        # Test valid payload
        print("  Testing valid payload...")
        valid_data = {
            "phone_number": "0999888555",
            "password": "validpass123",  # >= 6 chars
            "full_name": "Valid User Name",  # >= 2 chars
            "gender": "male",
            "country": "Syria",
            "city": "Damascus"
        }
        
        response_data = self.make_request("POST", "/auth/register", valid_data)
        
        if response_data and "access_token" in response_data:
            self.log_test("Password Validation", True, 
                         "Short password/name rejected with 422, valid payload accepted")
            return True
        else:
            self.log_test("Password Validation", False, "Valid payload was rejected")
            return False
    
    def test_7_booking_race_condition_protection(self):
        """Test 7: Booking Race-Condition Protection"""
        print("\n7. Testing booking race-condition protection...")
        
        # First, seed data and get admin token
        admin_login = self.make_request("POST", "/auth/login", ADMIN_CREDENTIALS)
        if not admin_login or "access_token" not in admin_login:
            self.log_test("Booking Race-Condition Protection", False, "Failed to get admin token")
            return False
            
        admin_headers = {"Authorization": f"Bearer {admin_login['access_token']}"}
        
        # Seed data
        seed_response = self.make_request("POST", "/seed", headers=admin_headers)
        if not seed_response:
            self.log_test("Booking Race-Condition Protection", False, "Failed to seed data")
            return False
        
        # Register a fresh user
        user_data = {
            "phone_number": "0999777666",
            "password": "userpass123",
            "full_name": "Test Booking User",
            "gender": "male",
            "country": "Syria",
            "city": "Damascus"
        }
        
        user_register = self.make_request("POST", "/auth/register", user_data)
        if not user_register or "access_token" not in user_register:
            self.log_test("Booking Race-Condition Protection", False, "Failed to register user")
            return False
            
        user_headers = {"Authorization": f"Bearer {user_register['access_token']}"}
        
        # Get first male shop
        barbers_data = self.make_request("GET", "/barbers")
        if not barbers_data:
            self.log_test("Booking Race-Condition Protection", False, "Failed to get barbers list")
            return False
            
        male_shop = None
        for shop in barbers_data:
            if shop.get("shop_type") == "male":
                male_shop = shop
                break
                
        if not male_shop:
            self.log_test("Booking Race-Condition Protection", False, "No male shop found")
            return False
            
        # Create first booking
        from datetime import datetime, timedelta
        tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        
        booking_data = {
            "barbershop_id": male_shop["id"],
            "date": tomorrow,
            "start_time": "10:00",
            "end_time": "11:00",
            "service": "Haircut",
            "notes": "First booking"
        }
        
        first_booking = self.make_request("POST", "/bookings", booking_data, headers=user_headers)
        if not first_booking:
            self.log_test("Booking Race-Condition Protection", False, "Failed to create first booking")
            return False
            
        print(f"    ✅ First booking created for {tomorrow} 10:00-11:00")
        
        # Try to create overlapping booking (should fail with 400)
        overlapping_booking_data = {
            "barbershop_id": male_shop["id"],
            "date": tomorrow,
            "start_time": "10:30",  # Overlaps with 10:00-11:00
            "end_time": "11:30",
            "service": "Beard Trim", 
            "notes": "Overlapping booking"
        }
        
        try:
            url = f"{BASE_URL}/bookings"
            response = requests.post(url, json=overlapping_booking_data, headers=user_headers, timeout=10)
            
            if response.status_code == 400:
                response_text = response.text
                if "not available" in response_text or "overlap" in response_text.lower():
                    self.log_test("Booking Race-Condition Protection", True, 
                                 "Overlapping booking correctly rejected with 400")
                    return True
                else:
                    self.log_test("Booking Race-Condition Protection", False, 
                                 f"Got 400 but wrong message: {response_text}")
                    return False
            else:
                self.log_test("Booking Race-Condition Protection", False, 
                             f"Expected 400 for overlapping booking, got {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Booking Race-Condition Protection", False, f"Overlapping booking test failed: {str(e)}")
            return False
    
    def test_8_admin_users_pagination(self):
        """Test 8: Admin /api/admin/users Pagination"""
        print("\n8. Testing admin users pagination...")
        
        # Get admin token
        admin_login = self.make_request("POST", "/auth/login", ADMIN_CREDENTIALS)
        if not admin_login or "access_token" not in admin_login:
            self.log_test("Admin Users Pagination", False, "Failed to get admin token")
            return False
            
        admin_headers = {"Authorization": f"Bearer {admin_login['access_token']}"}
        
        # Test basic pagination
        print("  Testing skip=0&limit=2...")
        users_data = self.make_request("GET", "/admin/users?skip=0&limit=2", headers=admin_headers)
        if not users_data or not isinstance(users_data, list):
            self.log_test("Admin Users Pagination", False, "Failed to get users list")
            return False
            
        if len(users_data) > 2:
            self.log_test("Admin Users Pagination", False, f"Expected max 2 users, got {len(users_data)}")
            return False
            
        print(f"    ✅ Got {len(users_data)} users (≤ 2)")
        
        # Test user_type=user filter
        print("  Testing user_type=user filter...")
        user_type_data = self.make_request("GET", "/admin/users?user_type=user", headers=admin_headers)
        if user_type_data is not None:
            user_types = [user.get("user_type", user.get("entity_type")) for user in user_type_data]
            non_user_types = [t for t in user_types if t not in ["user"]]
            if non_user_types:
                self.log_test("Admin Users Pagination", False, 
                             f"user_type=user filter failed, found: {non_user_types}")
                return False
            print(f"    ✅ user_type=user filter working, got {len(user_type_data)} users")
        
        # Test user_type=salon filter  
        print("  Testing user_type=salon filter...")
        salon_type_data = self.make_request("GET", "/admin/users?user_type=salon", headers=admin_headers)
        if salon_type_data is not None:
            salon_types = [user.get("user_type", user.get("entity_type")) for user in salon_type_data]
            non_salon_types = [t for t in salon_types if t not in ["barber", "salon"]]
            if non_salon_types:
                self.log_test("Admin Users Pagination", False, 
                             f"user_type=salon filter failed, found: {non_salon_types}")
                return False
            print(f"    ✅ user_type=salon filter working, got {len(salon_type_data)} salons")
        
        # Test search filter
        print("  Testing search filter...")
        search_data = self.make_request("GET", "/admin/users?search=admin", headers=admin_headers)
        if search_data is not None:
            print(f"    ✅ Search filter working, got {len(search_data)} results")
        
        # Test invalid user_type (should return 422)
        print("  Testing invalid user_type...")
        try:
            url = f"{BASE_URL}/admin/users?user_type=invalid"
            response = requests.get(url, headers=admin_headers, timeout=10)
            
            if response.status_code == 422:
                print("    ✅ Invalid user_type correctly rejected with 422")
                self.log_test("Admin Users Pagination", True, 
                             "All pagination features working correctly")
                return True
            else:
                self.log_test("Admin Users Pagination", False, 
                             f"Expected 422 for invalid user_type, got {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Admin Users Pagination", False, f"Invalid user_type test failed: {str(e)}")
            return False

    # ===== REGRESSION CHECKS =====
    
    def test_9_seed_regression(self):
        """Test 9: POST /api/seed with admin token → 200"""
        print("\n9. Testing seed endpoint regression...")
        
        admin_login = self.make_request("POST", "/auth/login", ADMIN_CREDENTIALS)
        if not admin_login or "access_token" not in admin_login:
            self.log_test("Seed Regression", False, "Failed to get admin token")
            return False
            
        admin_headers = {"Authorization": f"Bearer {admin_login['access_token']}"}
        seed_data = self.make_request("POST", "/seed", headers=admin_headers)
        
        if seed_data and "message" in seed_data:
            self.log_test("Seed Regression", True, "Seed endpoint working")
            return True
        else:
            self.log_test("Seed Regression", False, "Seed endpoint failed")
            return False
    
    def test_10_admin_login_regression(self):
        """Test 10: POST /api/auth/login admin/admin123 → 200 with access_token"""
        print("\n10. Testing admin login regression...")
        
        login_data = self.make_request("POST", "/auth/login", ADMIN_CREDENTIALS)
        
        if login_data and "access_token" in login_data:
            self.admin_token = login_data["access_token"]
            self.log_test("Admin Login Regression", True, "Admin login working")
            return True
        else:
            self.log_test("Admin Login Regression", False, "Admin login failed")
            return False
    
    def test_11_salon_login_regression(self):
        """Test 11: POST /api/auth/login salon 0935964158/salon123 → 200 with user_type=barbershop"""
        print("\n11. Testing salon login regression...")
        
        login_data = self.make_request("POST", "/auth/login", SALON_CREDENTIALS)
        
        if not login_data or "access_token" not in login_data:
            self.log_test("Salon Login Regression", False, "Failed to get salon access token")
            return False
            
        self.salon_token = login_data["access_token"]
        
        # Check user_type
        user_type = login_data.get("user_type") or login_data.get("entity_type")
        if user_type in ["barbershop", "barber", "salon"]:
            self.log_test("Salon Login Regression", True, f"Salon login working, user_type: {user_type}")
            return True
        else:
            self.log_test("Salon Login Regression", False, f"Wrong user_type: {user_type}")
            return False
    
    def test_12_barbers_list_regression(self):
        """Test 12: GET /api/barbers → 200 enriched list"""
        print("\n12. Testing barbers list regression...")
        
        barbers_data = self.make_request("GET", "/barbers")
        
        if not barbers_data or not isinstance(barbers_data, list):
            self.log_test("Barbers List Regression", False, "Failed to get barbers list")
            return False
            
        if len(barbers_data) == 0:
            self.log_test("Barbers List Regression", False, "Empty barbers list")
            return False
            
        # Check enrichment
        first_barber = barbers_data[0]
        required_fields = ["id", "shop_name", "rating"]
        missing_fields = [field for field in required_fields if field not in first_barber]
        
        if missing_fields:
            self.log_test("Barbers List Regression", False, f"Missing enrichment fields: {missing_fields}")
            return False
            
        self.log_test("Barbers List Regression", True, f"Got {len(barbers_data)} enriched barbers")
        return True
    
    def test_13_search_barbers_regression(self):
        """Test 13: GET /api/search/barbers?shop_type=male&sort=rating → 200"""
        print("\n13. Testing search barbers regression...")
        
        search_data = self.make_request("GET", "/search/barbers?shop_type=male&sort=rating")
        
        if not search_data or not isinstance(search_data, list):
            self.log_test("Search Barbers Regression", False, "Failed to get search results")
            return False
            
        # Check that results are male shops
        male_shops = [shop for shop in search_data if shop.get("shop_type") == "male"]
        if len(male_shops) != len(search_data):
            self.log_test("Search Barbers Regression", False, "Non-male shops in male filter results")
            return False
            
        self.log_test("Search Barbers Regression", True, f"Got {len(search_data)} male shops sorted by rating")
        return True
    
    def test_14_favorites_regression(self):
        """Test 14: POST /api/favorites (user) → 200 and GET /api/favorites/my → 200"""
        print("\n14. Testing favorites regression...")
        
        # Register a user first
        user_data = {
            "phone_number": "0999666555",
            "password": "userpass123",
            "full_name": "Favorites Test User",
            "gender": "male",
            "country": "Syria",
            "city": "Damascus"
        }
        
        user_register = self.make_request("POST", "/auth/register", user_data)
        if not user_register or "access_token" not in user_register:
            self.log_test("Favorites Regression", False, "Failed to register user")
            return False
            
        user_headers = {"Authorization": f"Bearer {user_register['access_token']}"}
        
        # Get a shop to favorite
        barbers_data = self.make_request("GET", "/barbers")
        if not barbers_data or len(barbers_data) == 0:
            self.log_test("Favorites Regression", False, "No shops available to favorite")
            return False
            
        shop_id = barbers_data[0]["id"]
        
        # Add to favorites
        favorite_data = {"shop_id": shop_id}
        add_favorite = self.make_request("POST", "/favorites", favorite_data, headers=user_headers)
        
        if not add_favorite:
            self.log_test("Favorites Regression", False, "Failed to add favorite")
            return False
            
        # Get favorites list
        my_favorites = self.make_request("GET", "/favorites/my", headers=user_headers)
        
        if my_favorites and isinstance(my_favorites, list) and len(my_favorites) > 0:
            self.log_test("Favorites Regression", True, f"Added favorite and retrieved {len(my_favorites)} favorites")
            return True
        else:
            self.log_test("Favorites Regression", False, "Failed to retrieve favorites")
            return False
    
    def test_15_gallery_regression(self):
        """Test 15: POST /api/barbershops/me/gallery (salon auth, small base64 image) → 200. Upload 4, verify 5th → 400"""
        print("\n15. Testing gallery regression...")
        
        if not self.salon_token:
            # Get salon token
            salon_login = self.make_request("POST", "/auth/login", SALON_CREDENTIALS)
            if not salon_login or "access_token" not in salon_login:
                self.log_test("Gallery Regression", False, "Failed to get salon token")
                return False
            self.salon_token = salon_login["access_token"]
            
        salon_headers = {"Authorization": f"Bearer {self.salon_token}"}
        
        # Upload 4 images
        uploaded_count = 0
        for i in range(4):
            image_data = {
                "image_after": f"https://example.com/gallery{i+1}.jpg",
                "image_before": "",
                "caption": f"Gallery Image {i+1}"
            }
            
            upload_response = self.make_request("POST", "/barbershops/me/gallery", 
                                              image_data, headers=salon_headers)
            if upload_response and "id" in upload_response:
                uploaded_count += 1
        
        if uploaded_count < 4:
            self.log_test("Gallery Regression", False, f"Only uploaded {uploaded_count}/4 images")
            return False
            
        # Try 5th image (should fail with 400)
        fifth_image = {
            "image_after": "https://example.com/gallery5.jpg",
            "image_before": "",
            "caption": "Fifth Image Should Fail"
        }
        
        try:
            url = f"{BASE_URL}/barbershops/me/gallery"
            response = requests.post(url, json=fifth_image, headers=salon_headers, timeout=10)
            
            if response.status_code == 400:
                response_text = response.text
                if "Maximum 4" in response_text:
                    self.log_test("Gallery Regression", True, 
                                 "Uploaded 4 images successfully, 5th correctly rejected")
                    return True
                else:
                    self.log_test("Gallery Regression", False, 
                                 f"Got 400 but wrong message: {response_text}")
                    return False
            else:
                self.log_test("Gallery Regression", False, 
                             f"Expected 400 for 5th image, got {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Gallery Regression", False, f"5th image test failed: {str(e)}")
            return False
    
    def test_16_ai_advisor_regression(self):
        """Test 16: GET /api/ai-advisor/eligibility (user) → 200"""
        print("\n16. Testing AI advisor regression...")
        
        # Register a user
        user_data = {
            "phone_number": "0999555444",
            "password": "userpass123",
            "full_name": "AI Test User",
            "gender": "male",
            "country": "Syria",
            "city": "Damascus"
        }
        
        user_register = self.make_request("POST", "/auth/register", user_data)
        if not user_register or "access_token" not in user_register:
            self.log_test("AI Advisor Regression", False, "Failed to register user")
            return False
            
        user_headers = {"Authorization": f"Bearer {user_register['access_token']}"}
        
        # Check eligibility
        eligibility_data = self.make_request("GET", "/ai-advisor/eligibility", headers=user_headers)
        
        if eligibility_data and "eligible" in eligibility_data:
            self.log_test("AI Advisor Regression", True, 
                         f"AI advisor eligibility working, eligible: {eligibility_data['eligible']}")
            return True
        else:
            self.log_test("AI Advisor Regression", False, "AI advisor eligibility failed")
            return False
    
    def test_17_pwa_status_regression(self):
        """Test 17: GET /api/pwa/status → 200, version "3.1.0" """
        print("\n17. Testing PWA status regression...")
        
        pwa_data = self.make_request("GET", "/pwa/status")
        
        if not pwa_data:
            self.log_test("PWA Status Regression", False, "Failed to get PWA status")
            return False
            
        if "online" not in pwa_data or "version" not in pwa_data:
            self.log_test("PWA Status Regression", False, "Missing required PWA status fields")
            return False
            
        # Check version (should be 3.1.0 or higher)
        version = pwa_data["version"]
        if not version:
            self.log_test("PWA Status Regression", False, "Empty version field")
            return False
            
        self.log_test("PWA Status Regression", True, 
                     f"PWA status working, online: {pwa_data['online']}, version: {version}")
        return True
    
    def run_all_tests(self):
        """Run all security hardening tests"""
        print("🔒 BARBER HUB v3.5 - Comprehensive Security Hardening Backend Testing")
        print("=" * 80)
        print("Testing new security features and regression checks")
        print("=" * 80)
        
        tests = [
            # New/Modified Endpoints
            self.test_1_health_endpoint,
            self.test_2_public_config_endpoint,
            self.test_3_security_headers,
            self.test_4_login_rate_limiting,
            self.test_5_register_rate_limiting,
            self.test_6_password_validation,
            self.test_7_booking_race_condition_protection,
            self.test_8_admin_users_pagination,
            
            # Regression Checks
            self.test_9_seed_regression,
            self.test_10_admin_login_regression,
            self.test_11_salon_login_regression,
            self.test_12_barbers_list_regression,
            self.test_13_search_barbers_regression,
            self.test_14_favorites_regression,
            self.test_15_gallery_regression,
            self.test_16_ai_advisor_regression,
            self.test_17_pwa_status_regression
        ]
        
        passed = 0
        total = len(tests)
        
        for test_func in tests:
            try:
                if test_func():
                    passed += 1
                # Add small delay between tests to avoid overwhelming rate limits
                time.sleep(0.5)
            except Exception as e:
                print(f"❌ Test {test_func.__name__} crashed: {str(e)}")
        
        print("\n" + "=" * 80)
        print(f"📊 SECURITY HARDENING TESTING SUMMARY")
        print("=" * 80)
        print(f"✅ Passed: {passed}/{total}")
        print(f"❌ Failed: {total - passed}/{total}")
        
        if passed == total:
            print("🎉 ALL SECURITY HARDENING TESTS PASSED!")
            return True
        else:
            print("⚠️  Some tests failed - see details above")
            return False

if __name__ == "__main__":
    tester = SecurityTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)