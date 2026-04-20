#!/usr/bin/env python3
"""
BARBER HUB v3.5 - Focused Security Testing
Testing critical security features with rate limit awareness
"""

import requests
import json
import sys
import time
from typing import Dict, Any, Optional

# API Configuration
BASE_URL = "https://vuln-checker-8.preview.emergentagent.com/api"

# Test Credentials
ADMIN_CREDENTIALS = {"phone_number": "admin", "password": "admin123"}
SALON_CREDENTIALS = {"phone_number": "0935964158", "password": "salon123"}

class FocusedSecurityTester:
    def __init__(self):
        self.admin_token = None
        self.salon_token = None
        self.test_results = []
        
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
            else:
                raise ValueError(f"Unsupported method: {method}")
                
            print(f"  {method} {endpoint} -> {response.status_code}")
            
            if response.status_code != expected_status:
                print(f"  Expected {expected_status}, got {response.status_code}")
                if response.text:
                    print(f"  Response: {response.text[:300]}")
                return None
                
            if response.content:
                return response.json()
            return {"status_code": response.status_code, "headers": dict(response.headers)}
            
        except Exception as e:
            print(f"  Request failed: {str(e)}")
            return None

    def test_health_endpoint(self):
        """Test GET /api/health"""
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
            
        if health_data["status"] not in ["ok", "degraded"]:
            self.log_test("Health Endpoint", False, f"Invalid status: {health_data['status']}")
            return False
            
        if health_data["db"] not in ["ok", "unreachable"]:
            self.log_test("Health Endpoint", False, f"Invalid db status: {health_data['db']}")
            return False
            
        self.log_test("Health Endpoint", True, 
                     f"Status: {health_data['status']}, DB: {health_data['db']}, Version: {health_data['version']}")
        return True

    def test_public_config_endpoint(self):
        """Test GET /api/config/public"""
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
            
        if not config_data["admin_whatsapp"]:
            self.log_test("Public Config Endpoint", False, "admin_whatsapp is empty")
            return False
            
        self.log_test("Public Config Endpoint", True, 
                     f"admin_whatsapp: {config_data['admin_whatsapp']}")
        return True

    def test_security_headers(self):
        """Test Security Headers using GET request"""
        print("\n3. Testing security headers...")
        
        try:
            url = f"{BASE_URL}/pwa/status"
            response = requests.get(url, timeout=10)
            
            if response.status_code != 200:
                self.log_test("Security Headers", False, f"Failed to get response: {response.status_code}")
                return False
                
            headers = dict(response.headers)
            
            required_headers = {
                "X-Content-Type-Options": "nosniff",
                "X-Frame-Options": "SAMEORIGIN", 
                "Referrer-Policy": "strict-origin-when-cross-origin",
                "Permissions-Policy": "geolocation=",
                "Strict-Transport-Security": "max-age="
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
            
        except Exception as e:
            self.log_test("Security Headers", False, f"Request failed: {str(e)}")
            return False

    def test_password_validation(self):
        """Test password validation without hitting rate limits"""
        print("\n4. Testing password validation...")
        
        # Test short password (3 chars)
        print("  Testing short password (3 chars)...")
        short_pass_data = {
            "phone_number": "0999111222",  # Unique phone
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
                    self.log_test("Password Validation", True, "Short password correctly rejected")
                    return True
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

    def test_admin_login_and_users_pagination(self):
        """Test admin login and users pagination"""
        print("\n5. Testing admin login and users pagination...")
        
        # Admin login
        admin_login = self.make_request("POST", "/auth/login", ADMIN_CREDENTIALS)
        if not admin_login or "access_token" not in admin_login:
            self.log_test("Admin Login & Users Pagination", False, "Failed to get admin token")
            return False
            
        admin_headers = {"Authorization": f"Bearer {admin_login['access_token']}"}
        
        # Test users pagination with limit
        print("  Testing admin users pagination...")
        users_data = self.make_request("GET", "/admin/users?skip=0&limit=2", headers=admin_headers)
        if not users_data or not isinstance(users_data, list):
            self.log_test("Admin Login & Users Pagination", False, "Failed to get users list")
            return False
            
        print(f"    Got {len(users_data)} users with limit=2")
        
        # Test user_type filter
        user_type_data = self.make_request("GET", "/admin/users?user_type=user", headers=admin_headers)
        if user_type_data is not None:
            print(f"    user_type=user filter returned {len(user_type_data)} users")
        
        # Test invalid user_type
        try:
            url = f"{BASE_URL}/admin/users?user_type=invalid"
            response = requests.get(url, headers=admin_headers, timeout=10)
            
            if response.status_code == 422:
                print("    ✅ Invalid user_type correctly rejected with 422")
                self.log_test("Admin Login & Users Pagination", True, 
                             "Admin login working, pagination features functional")
                return True
            else:
                self.log_test("Admin Login & Users Pagination", False, 
                             f"Expected 422 for invalid user_type, got {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Admin Login & Users Pagination", False, f"Invalid user_type test failed: {str(e)}")
            return False

    def test_existing_endpoints_regression(self):
        """Test key existing endpoints still work"""
        print("\n6. Testing existing endpoints regression...")
        
        # Test seed endpoint
        admin_login = self.make_request("POST", "/auth/login", ADMIN_CREDENTIALS)
        if not admin_login or "access_token" not in admin_login:
            self.log_test("Existing Endpoints Regression", False, "Failed to get admin token")
            return False
            
        admin_headers = {"Authorization": f"Bearer {admin_login['access_token']}"}
        seed_data = self.make_request("POST", "/seed", headers=admin_headers)
        
        if not seed_data or "message" not in seed_data:
            self.log_test("Existing Endpoints Regression", False, "Seed endpoint failed")
            return False
            
        # Test barbers list
        barbers_data = self.make_request("GET", "/barbers")
        if not barbers_data or not isinstance(barbers_data, list) or len(barbers_data) == 0:
            self.log_test("Existing Endpoints Regression", False, "Barbers list failed")
            return False
            
        # Test search
        search_data = self.make_request("GET", "/search/barbers?shop_type=male&sort=rating")
        if not search_data or not isinstance(search_data, list):
            self.log_test("Existing Endpoints Regression", False, "Search barbers failed")
            return False
            
        # Test PWA status
        pwa_data = self.make_request("GET", "/pwa/status")
        if not pwa_data or "online" not in pwa_data or "version" not in pwa_data:
            self.log_test("Existing Endpoints Regression", False, "PWA status failed")
            return False
            
        self.log_test("Existing Endpoints Regression", True, 
                     f"Seed, barbers list ({len(barbers_data)} shops), search ({len(search_data)} results), PWA status all working")
        return True

    def test_salon_login_after_cooldown(self):
        """Test salon login after rate limit cooldown"""
        print("\n7. Testing salon login after cooldown...")
        
        # Wait a bit more for rate limits to reset
        print("  Waiting for rate limit cooldown...")
        time.sleep(10)
        
        salon_login = self.make_request("POST", "/auth/login", SALON_CREDENTIALS)
        
        if salon_login and "access_token" in salon_login:
            user_type = salon_login.get("user_type") or salon_login.get("entity_type")
            if user_type in ["barbershop", "barber", "salon"]:
                self.log_test("Salon Login After Cooldown", True, f"Salon login working, user_type: {user_type}")
                return True
            else:
                self.log_test("Salon Login After Cooldown", False, f"Wrong user_type: {user_type}")
                return False
        else:
            self.log_test("Salon Login After Cooldown", False, "Salon login still failing")
            return False

    def run_focused_tests(self):
        """Run focused security tests"""
        print("🔒 BARBER HUB v3.5 - Focused Security Testing")
        print("=" * 60)
        print("Testing critical security features")
        print("=" * 60)
        
        tests = [
            self.test_health_endpoint,
            self.test_public_config_endpoint,
            self.test_security_headers,
            self.test_password_validation,
            self.test_admin_login_and_users_pagination,
            self.test_existing_endpoints_regression,
            self.test_salon_login_after_cooldown
        ]
        
        passed = 0
        total = len(tests)
        
        for test_func in tests:
            try:
                if test_func():
                    passed += 1
                time.sleep(2)  # Delay between tests
            except Exception as e:
                print(f"❌ Test {test_func.__name__} crashed: {str(e)}")
        
        print("\n" + "=" * 60)
        print(f"📊 FOCUSED SECURITY TESTING SUMMARY")
        print("=" * 60)
        print(f"✅ Passed: {passed}/{total}")
        print(f"❌ Failed: {total - passed}/{total}")
        
        return passed, total

if __name__ == "__main__":
    tester = FocusedSecurityTester()
    passed, total = tester.run_focused_tests()
    sys.exit(0 if passed == total else 1)