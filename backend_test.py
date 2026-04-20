#!/usr/bin/env python3
"""
BARBER HUB v3.6.1 - Security Audit Verification + Regression Testing
Testing all security features and regression items as specified in the review request.
"""

import requests
import json
import time
import base64
import re
from typing import Dict, Any, Optional

# Configuration
BASE_URL = "https://vuln-checker-8.preview.emergentagent.com/api"
SEED_TOKEN = "Seed_BHub_v36_X9Q2pT7vNcL8sJrK4mWzYbHfDgEa_c1u3iQoR5xZpV0nBkM6tH9wY2sLcA8jUe"

# Test credentials
ADMIN_CREDS = {"phone_number": "admin", "password": "admin123"}
SALON_CREDS = {"phone_number": "0935964158", "password": "salon123"}

class SecurityTester:
    def __init__(self):
        self.session = requests.Session()
        self.admin_token = None
        self.salon_token = None
        self.user_token = None
        self.test_results = []
        
    def log_test(self, test_name: str, passed: bool, details: str = ""):
        """Log test result"""
        status = "✅ PASS" if passed else "❌ FAIL"
        self.test_results.append({
            "test": test_name,
            "passed": passed,
            "details": details
        })
        print(f"{status} - {test_name}")
        if details:
            print(f"    {details}")
    
    def make_request(self, method: str, endpoint: str, **kwargs) -> requests.Response:
        """Make HTTP request with error handling"""
        url = f"{BASE_URL}{endpoint}"
        try:
            # Set default timeout if not provided
            if 'timeout' not in kwargs:
                kwargs['timeout'] = 30
            response = self.session.request(method, url, **kwargs)
            return response
        except Exception as e:
            print(f"Request failed: {method} {url} - {e}")
            raise
    
    def login_admin(self) -> bool:
        """Login as admin and store token"""
        try:
            response = self.make_request("POST", "/auth/login", json=ADMIN_CREDS)
            if response.status_code == 200:
                data = response.json()
                self.admin_token = data.get("access_token")
                return True
            return False
        except Exception:
            return False
    
    def login_salon(self) -> bool:
        """Login as salon and store token"""
        try:
            response = self.make_request("POST", "/auth/login", json=SALON_CREDS)
            if response.status_code == 200:
                data = response.json()
                self.salon_token = data.get("access_token")
                return True
            return False
        except Exception:
            return False
    
    def register_test_user(self) -> Optional[str]:
        """Register a test user and return token"""
        import random
        phone = f"test{random.randint(100000, 999999)}"
        user_data = {
            "phone_number": phone,
            "full_name": "Test User",
            "password": "test123",
            "gender": "male",
            "country": "سوريا",
            "city": "دمشق"
        }
        try:
            response = self.make_request("POST", "/auth/register", json=user_data)
            if response.status_code == 200:
                data = response.json()
                return data.get("access_token")
            return None
        except Exception:
            return None
    
    def test_seed_endpoint_security(self):
        """Test 1: POST /api/seed lock"""
        print("\n=== Testing POST /api/seed Security ===")
        
        # Test 1.1: Without auth and without X-Seed-Token → expect 403
        response = self.make_request("POST", "/seed")
        expected_403 = response.status_code == 403
        details = f"Status: {response.status_code}, Response: {response.text[:100]}"
        self.log_test("Seed endpoint - No auth/token returns 403", expected_403, details)
        
        # Test 1.2: With wrong X-Seed-Token → expect 403
        headers = {"X-Seed-Token": "wrong"}
        response = self.make_request("POST", "/seed", headers=headers)
        expected_403 = response.status_code == 403
        details = f"Status: {response.status_code}, Response: {response.text[:100]}"
        self.log_test("Seed endpoint - Wrong token returns 403", expected_403, details)
        
        # Test 1.3: With correct X-Seed-Token → expect 200
        headers = {"X-Seed-Token": SEED_TOKEN}
        response = self.make_request("POST", "/seed", headers=headers)
        expected_200 = response.status_code == 200
        if expected_200:
            data = response.json()
            has_count = "barbershop_count" in data
            details = f"Status: {response.status_code}, Count: {data.get('barbershop_count', 'N/A')}"
        else:
            has_count = False
            details = f"Status: {response.status_code}, Response: {response.text[:100]}"
        self.log_test("Seed endpoint - Correct token returns 200", expected_200 and has_count, details)
        
        # Test 1.4: With admin Bearer token (no seed token) → expect 200
        if self.login_admin():
            headers = {"Authorization": f"Bearer {self.admin_token}"}
            response = self.make_request("POST", "/seed", headers=headers)
            expected_200 = response.status_code == 200
            details = f"Status: {response.status_code}"
            self.log_test("Seed endpoint - Admin token bypass works", expected_200, details)
        else:
            self.log_test("Seed endpoint - Admin token bypass works", False, "Failed to login as admin")
    
    def test_usage_stats_authorization(self):
        """Test 2: GET /api/admin/usage-stats authorization & PII anonymization"""
        print("\n=== Testing Usage Stats Authorization ===")
        
        # Test 2.1: Unauthenticated → 401
        response = self.make_request("GET", "/admin/usage-stats")
        expected_401 = response.status_code == 401
        details = f"Status: {response.status_code}"
        self.log_test("Usage stats - Unauthenticated returns 401", expected_401, details)
        
        # Test 2.2: As regular user → 403
        user_token = self.register_test_user()
        if user_token:
            headers = {"Authorization": f"Bearer {user_token}"}
            response = self.make_request("GET", "/admin/usage-stats", headers=headers)
            expected_403 = response.status_code == 403
            details = f"Status: {response.status_code}"
            self.log_test("Usage stats - Regular user returns 403", expected_403, details)
        else:
            self.log_test("Usage stats - Regular user returns 403", False, "Failed to register test user")
        
        # Test 2.3: As salon → 200 with anonymized data
        if self.login_salon():
            headers = {"Authorization": f"Bearer {self.salon_token}"}
            response = self.make_request("GET", "/admin/usage-stats", headers=headers)
            if response.status_code == 200:
                data = response.json()
                top_users = data.get("top_users", {})
                advisor_users = top_users.get("ai_advisor", [])
                tryon_users = top_users.get("ai_tryon", [])
                
                # Check for anonymization (should have user_hash, not _id)
                anonymized = True
                for user in advisor_users + tryon_users:
                    if "_id" in user or "user_id" in user:
                        anonymized = False
                        break
                    if not ("user_hash" in user and "rank" in user and "count" in user):
                        anonymized = False
                        break
                
                details = f"Status: {response.status_code}, Anonymized: {anonymized}"
                self.log_test("Usage stats - Salon gets anonymized data", anonymized, details)
            else:
                details = f"Status: {response.status_code}"
                self.log_test("Usage stats - Salon gets anonymized data", False, details)
        else:
            self.log_test("Usage stats - Salon gets anonymized data", False, "Failed to login as salon")
        
        # Test 2.4: As admin → 200 with raw data allowed
        if self.admin_token:
            headers = {"Authorization": f"Bearer {self.admin_token}"}
            response = self.make_request("GET", "/admin/usage-stats", headers=headers)
            expected_200 = response.status_code == 200
            details = f"Status: {response.status_code}"
            self.log_test("Usage stats - Admin access works", expected_200, details)
    
    def test_booking_idor_fix(self):
        """Test 3: GET /api/bookings/{booking_id} IDOR fix"""
        print("\n=== Testing Booking IDOR Fix ===")
        
        # First, get a booking ID from salon's bookings
        booking_id = None
        if self.login_salon():
            headers = {"Authorization": f"Bearer {self.salon_token}"}
            # Get salon's shop ID first
            response = self.make_request("GET", "/barbers/profile/me", headers=headers)
            if response.status_code == 200:
                shop_data = response.json()
                shop_id = shop_data.get("id")
                
                # Get bookings for this shop
                response = self.make_request("GET", f"/bookings/shop/{shop_id}", headers=headers)
                if response.status_code == 200:
                    bookings = response.json()
                    if bookings:
                        booking_id = bookings[0].get("id")
        
        if not booking_id:
            self.log_test("Booking IDOR - Test setup", False, "No booking found to test with")
            return
        
        # Test 3.1: As anonymous → expect 401
        response = self.make_request("GET", f"/bookings/{booking_id}")
        expected_401 = response.status_code == 401
        details = f"Status: {response.status_code}"
        self.log_test("Booking IDOR - Anonymous returns 401", expected_401, details)
        
        # Test 3.2: As different user → expect 403
        user_token = self.register_test_user()
        if user_token:
            headers = {"Authorization": f"Bearer {user_token}"}
            response = self.make_request("GET", f"/bookings/{booking_id}", headers=headers)
            expected_403 = response.status_code == 403
            details = f"Status: {response.status_code}"
            self.log_test("Booking IDOR - Different user returns 403", expected_403, details)
        
        # Test 3.3: As owning salon → expect 200
        if self.salon_token:
            headers = {"Authorization": f"Bearer {self.salon_token}"}
            response = self.make_request("GET", f"/bookings/{booking_id}", headers=headers)
            expected_200 = response.status_code == 200
            details = f"Status: {response.status_code}"
            self.log_test("Booking IDOR - Owning salon returns 200", expected_200, details)
        
        # Test 3.4: As admin → expect 200
        if self.admin_token:
            headers = {"Authorization": f"Bearer {self.admin_token}"}
            response = self.make_request("GET", f"/bookings/{booking_id}", headers=headers)
            expected_200 = response.status_code == 200
            details = f"Status: {response.status_code}"
            self.log_test("Booking IDOR - Admin returns 200", expected_200, details)
    
    def test_register_barbershop_rate_limit(self):
        """Test 4: POST /api/auth/register-barbershop rate limit"""
        print("\n=== Testing Register Barbershop Rate Limit ===")
        
        # Send 11 sequential register-barbershop POSTs
        success_count = 0
        rate_limited = False
        
        for i in range(11):
            shop_data = {
                "owner_name": f"Test Owner {i}",
                "shop_name": f"Test Shop {i}",
                "shop_type": "male",
                "phone_number": f"test{i}{int(time.time())}",
                "password": "test123",
                "country": "سوريا",
                "city": "دمشق"
            }
            
            response = self.make_request("POST", "/auth/register-barbershop", json=shop_data)
            
            if response.status_code == 200:
                success_count += 1
            elif response.status_code == 429:
                rate_limited = True
                break
            elif response.status_code == 400 and "already registered" in response.text:
                # Phone number collision, try with different number
                continue
            
            time.sleep(0.1)  # Small delay between requests
        
        # The 11th request should return 429
        expected_rate_limit = rate_limited and success_count >= 10
        details = f"Successful registrations: {success_count}, Rate limited: {rate_limited}"
        self.log_test("Register barbershop - Rate limit at 11th request", expected_rate_limit, details)
    
    def test_search_regex_safety(self):
        """Test 5: GET /api/search/barbers regex safety"""
        print("\n=== Testing Search Regex Safety ===")
        
        # Test 5.1: Malicious regex patterns should not cause 500 or hang
        malicious_patterns = [".*+++++", "(((((", ".*.*.*.*.*", "(?:(?:(?:(?:(?:"]
        
        for pattern in malicious_patterns:
            start_time = time.time()
            response = self.make_request("GET", f"/search/barbers?search={pattern}", timeout=10)
            elapsed = time.time() - start_time
            
            safe = response.status_code == 200 and elapsed < 5
            details = f"Pattern: {pattern}, Status: {response.status_code}, Time: {elapsed:.2f}s"
            self.log_test(f"Search regex safety - Pattern '{pattern[:10]}...'", safe, details)
        
        # Test 5.2: Valid search should work
        response = self.make_request("GET", "/search/barbers?search=king")
        if response.status_code == 200:
            data = response.json()
            has_results = len(data) > 0
            details = f"Status: {response.status_code}, Results: {len(data)}"
            self.log_test("Search regex safety - Valid search works", has_results, details)
        else:
            details = f"Status: {response.status_code}"
            self.log_test("Search regex safety - Valid search works", False, details)
    
    def test_products_featured_fallback(self):
        """Test 6: GET /api/products/featured fallback"""
        print("\n=== Testing Products Featured Fallback ===")
        
        # Test 6.1: Without query → expect 200 with at least 5 products
        response = self.make_request("GET", "/products/featured")
        if response.status_code == 200:
            data = response.json()
            has_enough = len(data) >= 5
            
            # Check if products have required fields
            valid_structure = True
            for product in data[:3]:  # Check first 3
                if not all(field in product for field in ["shop_name", "shop_city", "shop_country"]):
                    valid_structure = False
                    break
            
            success = has_enough and valid_structure
            details = f"Status: {response.status_code}, Count: {len(data)}, Valid structure: {valid_structure}"
            self.log_test("Products featured - Default query returns enough products", success, details)
        else:
            details = f"Status: {response.status_code}"
            self.log_test("Products featured - Default query returns enough products", False, details)
        
        # Test 6.2: With limit=2 → expect exactly up to 2
        response = self.make_request("GET", "/products/featured?limit=2")
        if response.status_code == 200:
            data = response.json()
            correct_limit = len(data) <= 2
            details = f"Status: {response.status_code}, Count: {len(data)}"
            self.log_test("Products featured - Limit parameter works", correct_limit, details)
        else:
            details = f"Status: {response.status_code}"
            self.log_test("Products featured - Limit parameter works", False, details)
        
        # Test 6.3: With limit=999 → should clamp to 50 and not error
        response = self.make_request("GET", "/products/featured?limit=999")
        if response.status_code == 200:
            data = response.json()
            clamped = len(data) <= 50
            details = f"Status: {response.status_code}, Count: {len(data)}"
            self.log_test("Products featured - Large limit clamped", clamped, details)
        else:
            details = f"Status: {response.status_code}"
            self.log_test("Products featured - Large limit clamped", False, details)
    
    def test_tier_status_dependency_fix(self):
        """Test 7: GET /api/barbershops/me/tier-status dependency fix"""
        print("\n=== Testing Tier Status Dependency Fix ===")
        
        # Test 7.1: As salon → 200 with expected structure
        if self.login_salon():
            headers = {"Authorization": f"Bearer {self.salon_token}"}
            response = self.make_request("GET", "/barbershops/me/tier-status", headers=headers)
            if response.status_code == 200:
                data = response.json()
                required_fields = ["current_tier", "tiers_status", "current_state"]
                has_fields = all(field in data for field in required_fields)
                details = f"Status: {response.status_code}, Has required fields: {has_fields}"
                self.log_test("Tier status - Salon access works", has_fields, details)
            else:
                details = f"Status: {response.status_code}"
                self.log_test("Tier status - Salon access works", False, details)
        else:
            self.log_test("Tier status - Salon access works", False, "Failed to login as salon")
        
        # Test 7.2: As regular user → 403
        user_token = self.register_test_user()
        if user_token:
            headers = {"Authorization": f"Bearer {user_token}"}
            response = self.make_request("GET", "/barbershops/me/tier-status", headers=headers)
            expected_403 = response.status_code == 403
            details = f"Status: {response.status_code}"
            self.log_test("Tier status - Regular user returns 403", expected_403, details)
        
        # Test 7.3: Unauthenticated → 401
        response = self.make_request("GET", "/barbershops/me/tier-status")
        expected_401 = response.status_code == 401
        details = f"Status: {response.status_code}"
        self.log_test("Tier status - Unauthenticated returns 401", expected_401, details)
    
    def test_ai_service_error_sanitization(self):
        """Test 8: AI service error sanitization"""
        print("\n=== Testing AI Service Error Sanitization ===")
        
        # This test requires a confirmed booking and AI services to be configured
        # We'll test with garbage image data to trigger an error
        user_token = self.register_test_user()
        if not user_token:
            self.log_test("AI error sanitization - Test setup", False, "Failed to register test user")
            return
        
        # Try to call AI advisor with garbage data
        headers = {"Authorization": f"Bearer {user_token}"}
        payload = {
            "booking_id": "fake-booking-id",
            "image_base64": "not-an-image",
            "language": "en"
        }
        
        response = self.make_request("POST", "/ai-advisor/analyze", json=payload, headers=headers)
        
        # Should return a sanitized error message, not stack traces
        if response.status_code in [500, 503, 404, 403]:
            response_text = response.text.lower()
            has_stack_trace = any(keyword in response_text for keyword in [
                "traceback", "file \"", "line ", "import", "module", "error:", "exception:"
            ])
            sanitized = not has_stack_trace
            details = f"Status: {response.status_code}, Sanitized: {sanitized}"
            self.log_test("AI error sanitization - No stack traces leaked", sanitized, details)
        else:
            details = f"Status: {response.status_code}"
            self.log_test("AI error sanitization - No stack traces leaked", True, details)
    
    def test_security_headers(self):
        """Test 9: Security headers + CSP"""
        print("\n=== Testing Security Headers ===")
        
        # Test on a JSON API response
        response = self.make_request("GET", "/health")
        
        required_headers = {
            "X-Content-Type-Options": "nosniff",
            "X-Frame-Options": "SAMEORIGIN", 
            "Referrer-Policy": "strict-origin-when-cross-origin",
            "Strict-Transport-Security": None,  # Just check presence
            "Content-Security-Policy": None
        }
        
        missing_headers = []
        for header, expected_value in required_headers.items():
            if header not in response.headers:
                missing_headers.append(header)
            elif expected_value and response.headers[header] != expected_value:
                missing_headers.append(f"{header} (wrong value)")
        
        all_present = len(missing_headers) == 0
        details = f"Status: {response.status_code}, Missing: {missing_headers}"
        self.log_test("Security headers - All required headers present", all_present, details)
        
        # Check CSP for JSON response
        csp = response.headers.get("Content-Security-Policy", "")
        json_csp_correct = "default-src 'none'" in csp and "frame-ancestors 'none'" in csp
        details = f"CSP: {csp[:50]}..."
        self.log_test("Security headers - JSON CSP correct", json_csp_correct, details)
    
    def test_image_size_validation(self):
        """Test 10: Image-size validation"""
        print("\n=== Testing Image Size Validation ===")
        
        if not self.login_salon():
            self.log_test("Image size validation - Test setup", False, "Failed to login as salon")
            return
        
        headers = {"Authorization": f"Bearer {self.salon_token}"}
        
        # Create a large base64 string (~10MB)
        large_data = "A" * (10 * 1024 * 1024)  # 10MB of 'A' characters
        large_image = f"data:image/jpeg;base64,{large_data}"
        
        product_data = {
            "name": "Test Product",
            "price": 10.0,
            "category": "test",
            "image_url": large_image
        }
        
        response = self.make_request("POST", "/products", json=product_data, headers=headers)
        
        # Should return 413 with size error
        expected_413 = response.status_code == 413
        has_size_message = "too large" in response.text.lower() or "max" in response.text.lower()
        
        success = expected_413 and has_size_message
        details = f"Status: {response.status_code}, Has size message: {has_size_message}"
        self.log_test("Image size validation - Large image rejected", success, details)
        
        # Test with empty image_url → should work
        product_data["image_url"] = ""
        response = self.make_request("POST", "/products", json=product_data, headers=headers)
        expected_200 = response.status_code == 200
        details = f"Status: {response.status_code}"
        self.log_test("Image size validation - Empty image accepted", expected_200, details)
    
    def test_regression_endpoints(self):
        """Test regression - must still pass"""
        print("\n=== Testing Regression Endpoints ===")
        
        # Test admin login
        response = self.make_request("POST", "/auth/login", json=ADMIN_CREDS)
        admin_login_ok = response.status_code == 200 and "access_token" in response.json()
        self.log_test("Regression - Admin login works", admin_login_ok)
        
        # Test salon login  
        response = self.make_request("POST", "/auth/login", json=SALON_CREDS)
        salon_login_ok = response.status_code == 200 and "access_token" in response.json()
        self.log_test("Regression - Salon login works", salon_login_ok)
        
        # Test health endpoint
        response = self.make_request("GET", "/health")
        health_ok = response.status_code == 200 and response.json().get("status") == "ok"
        self.log_test("Regression - Health endpoint works", health_ok)
        
        # Test public config
        response = self.make_request("GET", "/config/public")
        config_ok = response.status_code == 200 and "admin_whatsapp" in response.json()
        self.log_test("Regression - Public config works", config_ok)
        
        # Test barbers listing
        response = self.make_request("GET", "/barbers")
        if response.status_code == 200:
            data = response.json()
            barbers_ok = len(data) == 10 and all("tier_badge" in shop for shop in data)
            details = f"Count: {len(data)}, Has tier_badge: {all('tier_badge' in shop for shop in data)}"
        else:
            barbers_ok = False
            details = f"Status: {response.status_code}"
        self.log_test("Regression - Barbers listing works", barbers_ok, details)
        
        # Test ranking tiers
        response = self.make_request("GET", "/ranking/tiers")
        if response.status_code == 200:
            data = response.json()
            required_keys = ["global_elite", "country_top", "governorate_top", "city_top"]
            tiers_ok = all(key in data for key in required_keys)
        else:
            tiers_ok = False
        self.log_test("Regression - Ranking tiers works", tiers_ok)
        
        # Test admin stats (requires admin token)
        if self.admin_token:
            headers = {"Authorization": f"Bearer {self.admin_token}"}
            response = self.make_request("GET", "/admin/stats", headers=headers)
            admin_stats_ok = response.status_code == 200
            self.log_test("Regression - Admin stats works", admin_stats_ok)
    
    def test_login_rate_limiting(self):
        """Test login rate limiting regression"""
        print("\n=== Testing Login Rate Limiting ===")
        
        # Test rate limiting on wrong password attempts
        wrong_creds = {"phone_number": "0935964158", "password": "wrongpassword"}
        
        rate_limited = False
        for i in range(9):  # Try 9 times
            response = self.make_request("POST", "/auth/login", json=wrong_creds)
            if response.status_code == 429:
                rate_limited = True
                break
            time.sleep(0.1)
        
        # Should be rate limited by 8th or 9th attempt
        self.log_test("Regression - Login rate limiting works", rate_limited)
        
        # Admin login should still work (different identifier)
        if not rate_limited:
            # If we didn't hit rate limit, try a few more times
            for i in range(3):
                response = self.make_request("POST", "/auth/login", json=wrong_creds)
                if response.status_code == 429:
                    rate_limited = True
                    break
                time.sleep(0.1)
        
        # Test that admin can still login
        response = self.make_request("POST", "/auth/login", json=ADMIN_CREDS)
        admin_still_works = response.status_code == 200
        self.log_test("Regression - Admin login works after rate limit", admin_still_works)
    
    def run_all_tests(self):
        """Run all security tests"""
        print("🔒 BARBER HUB v3.6.1 - Security Audit Verification")
        print("=" * 60)
        
        # Run all test methods
        self.test_seed_endpoint_security()
        self.test_usage_stats_authorization()
        self.test_booking_idor_fix()
        self.test_register_barbershop_rate_limit()
        self.test_search_regex_safety()
        self.test_products_featured_fallback()
        self.test_tier_status_dependency_fix()
        self.test_ai_service_error_sanitization()
        self.test_security_headers()
        self.test_image_size_validation()
        self.test_regression_endpoints()
        self.test_login_rate_limiting()
        
        # Summary
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        
        passed = sum(1 for result in self.test_results if result["passed"])
        total = len(self.test_results)
        
        print(f"Total Tests: {total}")
        print(f"Passed: {passed}")
        print(f"Failed: {total - passed}")
        print(f"Success Rate: {(passed/total)*100:.1f}%")
        
        # Show failed tests
        failed_tests = [result for result in self.test_results if not result["passed"]]
        if failed_tests:
            print(f"\n❌ FAILED TESTS ({len(failed_tests)}):")
            for test in failed_tests:
                print(f"  - {test['test']}")
                if test['details']:
                    print(f"    {test['details']}")
        else:
            print("\n🎉 ALL TESTS PASSED!")
        
        return passed, total

if __name__ == "__main__":
    tester = SecurityTester()
    passed, total = tester.run_all_tests()
    
    # Exit with appropriate code
    exit(0 if passed == total else 1)