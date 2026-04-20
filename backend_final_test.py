#!/usr/bin/env python3
"""
BARBER HUB v3.5 - Final Security Testing
Comprehensive testing with proper header case handling
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

class FinalSecurityTester:
    def __init__(self):
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

    def test_new_endpoints(self):
        """Test all new/modified endpoints"""
        print("\n=== NEW/MODIFIED ENDPOINTS ===")
        
        # 1. Health endpoint
        print("\n1. Testing GET /api/health...")
        health_data = self.make_request("GET", "/health")
        
        if health_data and all(field in health_data for field in ["status", "db", "version", "timestamp"]):
            if health_data["status"] in ["ok", "degraded"] and health_data["db"] in ["ok", "unreachable"]:
                self.log_test("Health Endpoint", True, f"Status: {health_data['status']}, DB: {health_data['db']}")
            else:
                self.log_test("Health Endpoint", False, f"Invalid status values")
        else:
            self.log_test("Health Endpoint", False, "Missing required fields or failed request")
        
        # 2. Public config endpoint
        print("\n2. Testing GET /api/config/public...")
        config_data = self.make_request("GET", "/config/public")
        
        if config_data and all(field in config_data for field in ["admin_whatsapp", "app_url", "version"]):
            if config_data["admin_whatsapp"]:
                self.log_test("Public Config Endpoint", True, f"admin_whatsapp: {config_data['admin_whatsapp']}")
            else:
                self.log_test("Public Config Endpoint", False, "admin_whatsapp is empty")
        else:
            self.log_test("Public Config Endpoint", False, "Missing required fields or failed request")
        
        # 3. Security headers
        print("\n3. Testing Security Headers...")
        try:
            response = requests.get(f"{BASE_URL}/pwa/status", timeout=10)
            if response.status_code == 200:
                # Convert headers to lowercase for case-insensitive comparison
                headers_lower = {k.lower(): v for k, v in response.headers.items()}
                
                required_headers = {
                    "x-content-type-options": "nosniff",
                    "x-frame-options": "sameorigin",
                    "referrer-policy": "strict-origin-when-cross-origin",
                    "permissions-policy": "geolocation=",
                    "strict-transport-security": "max-age="
                }
                
                missing_headers = []
                invalid_headers = []
                
                for header_name, expected_value in required_headers.items():
                    if header_name not in headers_lower:
                        missing_headers.append(header_name)
                    elif expected_value not in headers_lower[header_name].lower():
                        invalid_headers.append(f"{header_name}: {headers_lower[header_name]}")
                
                if not missing_headers and not invalid_headers:
                    self.log_test("Security Headers", True, "All required security headers present")
                else:
                    self.log_test("Security Headers", False, 
                                f"Missing: {missing_headers}, Invalid: {invalid_headers}")
            else:
                self.log_test("Security Headers", False, f"Failed to get response: {response.status_code}")
        except Exception as e:
            self.log_test("Security Headers", False, f"Request failed: {str(e)}")
        
        # 4. Password validation
        print("\n4. Testing Password Validation...")
        try:
            short_pass_data = {
                "phone_number": "0999000111",
                "password": "abc",  # Too short
                "full_name": "Test User",
                "gender": "male",
                "country": "Syria",
                "city": "Damascus"
            }
            
            response = requests.post(f"{BASE_URL}/auth/register", json=short_pass_data, timeout=10)
            
            if response.status_code == 422:
                response_text = response.text
                if "6 characters" in response_text or "at least 6" in response_text:
                    self.log_test("Password Validation", True, "Short password correctly rejected with 422")
                else:
                    self.log_test("Password Validation", False, f"Got 422 but wrong message: {response_text}")
            else:
                self.log_test("Password Validation", False, f"Expected 422, got {response.status_code}")
        except Exception as e:
            self.log_test("Password Validation", False, f"Test failed: {str(e)}")

    def test_admin_features(self):
        """Test admin login and pagination"""
        print("\n=== ADMIN FEATURES ===")
        
        # Admin login
        print("\n5. Testing Admin Login...")
        admin_login = self.make_request("POST", "/auth/login", ADMIN_CREDENTIALS)
        
        if admin_login and "access_token" in admin_login:
            admin_headers = {"Authorization": f"Bearer {admin_login['access_token']}"}
            self.log_test("Admin Login", True, "Admin login successful")
            
            # Admin users pagination
            print("\n6. Testing Admin Users Pagination...")
            users_data = self.make_request("GET", "/admin/users?skip=0&limit=2", headers=admin_headers)
            
            if users_data and isinstance(users_data, list):
                # Test invalid user_type
                try:
                    response = requests.get(f"{BASE_URL}/admin/users?user_type=invalid", 
                                          headers=admin_headers, timeout=10)
                    if response.status_code == 422:
                        self.log_test("Admin Users Pagination", True, 
                                    f"Pagination working, got {len(users_data)} users, invalid user_type rejected")
                    else:
                        self.log_test("Admin Users Pagination", False, 
                                    f"Expected 422 for invalid user_type, got {response.status_code}")
                except Exception as e:
                    self.log_test("Admin Users Pagination", False, f"Invalid user_type test failed: {str(e)}")
            else:
                self.log_test("Admin Users Pagination", False, "Failed to get users list")
        else:
            self.log_test("Admin Login", False, "Admin login failed")

    def test_regression_endpoints(self):
        """Test regression - existing endpoints must still work"""
        print("\n=== REGRESSION CHECKS ===")
        
        # Get admin token for seed
        admin_login = self.make_request("POST", "/auth/login", ADMIN_CREDENTIALS)
        if admin_login and "access_token" in admin_login:
            admin_headers = {"Authorization": f"Bearer {admin_login['access_token']}"}
            
            # 7. Seed endpoint
            print("\n7. Testing POST /api/seed...")
            seed_data = self.make_request("POST", "/seed", headers=admin_headers)
            if seed_data and "message" in seed_data:
                self.log_test("Seed Regression", True, "Seed endpoint working")
            else:
                self.log_test("Seed Regression", False, "Seed endpoint failed")
        
        # 8. Salon login
        print("\n8. Testing Salon Login...")
        salon_login = self.make_request("POST", "/auth/login", SALON_CREDENTIALS)
        if salon_login and "access_token" in salon_login:
            user_type = salon_login.get("user_type") or salon_login.get("entity_type")
            if user_type in ["barbershop", "barber", "salon"]:
                self.log_test("Salon Login Regression", True, f"Salon login working, user_type: {user_type}")
            else:
                self.log_test("Salon Login Regression", False, f"Wrong user_type: {user_type}")
        else:
            self.log_test("Salon Login Regression", False, "Salon login failed")
        
        # 9. Barbers list
        print("\n9. Testing GET /api/barbers...")
        barbers_data = self.make_request("GET", "/barbers")
        if barbers_data and isinstance(barbers_data, list) and len(barbers_data) > 0:
            self.log_test("Barbers List Regression", True, f"Got {len(barbers_data)} enriched barbers")
        else:
            self.log_test("Barbers List Regression", False, "Barbers list failed")
        
        # 10. Search barbers
        print("\n10. Testing GET /api/search/barbers...")
        search_data = self.make_request("GET", "/search/barbers?shop_type=male&sort=rating")
        if search_data and isinstance(search_data, list):
            male_shops = [shop for shop in search_data if shop.get("shop_type") == "male"]
            if len(male_shops) == len(search_data):
                self.log_test("Search Barbers Regression", True, f"Got {len(search_data)} male shops")
            else:
                self.log_test("Search Barbers Regression", False, "Non-male shops in male filter results")
        else:
            self.log_test("Search Barbers Regression", False, "Search barbers failed")
        
        # 11. PWA status
        print("\n11. Testing GET /api/pwa/status...")
        pwa_data = self.make_request("GET", "/pwa/status")
        if pwa_data and "online" in pwa_data and "version" in pwa_data:
            self.log_test("PWA Status Regression", True, f"PWA status working, version: {pwa_data['version']}")
        else:
            self.log_test("PWA Status Regression", False, "PWA status failed")

    def run_final_tests(self):
        """Run final comprehensive security tests"""
        print("🔒 BARBER HUB v3.5 - Final Security Testing")
        print("=" * 70)
        print("Testing new security features and regression checks")
        print("=" * 70)
        
        self.test_new_endpoints()
        time.sleep(2)
        self.test_admin_features()
        time.sleep(2)
        self.test_regression_endpoints()
        
        # Summary
        passed = sum(1 for result in self.test_results if result["success"])
        total = len(self.test_results)
        
        print("\n" + "=" * 70)
        print(f"📊 FINAL SECURITY TESTING SUMMARY")
        print("=" * 70)
        print(f"✅ Passed: {passed}/{total}")
        print(f"❌ Failed: {total - passed}/{total}")
        
        # Detailed results
        print("\n📋 DETAILED RESULTS:")
        for result in self.test_results:
            status = "✅" if result["success"] else "❌"
            print(f"{status} {result['test']}")
            if result["details"]:
                print(f"   {result['details']}")
        
        return passed, total

if __name__ == "__main__":
    tester = FinalSecurityTester()
    passed, total = tester.run_final_tests()
    sys.exit(0 if passed == total else 1)