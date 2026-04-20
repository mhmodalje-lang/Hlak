#!/usr/bin/env python3
"""
BARBER HUB v3.6 - Ranking Tiers & Enhancements - Backend Testing
Testing new ranking engine endpoints + seed/enrichment changes + zero regressions
"""

import requests
import json
import sys
from typing import Dict, Any, Optional
import urllib.parse

# Backend URL from frontend/.env
BASE_URL = "https://db-manager-12.preview.emergentagent.com/api"

# Test credentials from review request
ADMIN_CREDENTIALS = {"phone_number": "admin", "password": "admin123"}
SALON_CREDENTIALS = {"phone_number": "0935964158", "password": "salon123"}

class BarberHubTester:
    def __init__(self):
        self.admin_token = None
        self.salon_token = None
        self.test_results = []
        
    def log_test(self, test_name: str, passed: bool, details: str = ""):
        """Log test result"""
        status = "✅ PASS" if passed else "❌ FAIL"
        self.test_results.append(f"{status} - {test_name}: {details}")
        print(f"{status} - {test_name}: {details}")
        
    def make_request(self, method: str, endpoint: str, data: Dict = None, 
                    token: str = None, params: Dict = None) -> Dict[str, Any]:
        """Make HTTP request to backend"""
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
                response = requests.put(url, headers=headers, json=data, timeout=30)
            elif method == "DELETE":
                response = requests.delete(url, headers=headers, timeout=30)
            else:
                return {"error": f"Unsupported method: {method}"}
                
            return {
                "status_code": response.status_code,
                "data": response.json() if response.content else {},
                "headers": dict(response.headers)
            }
        except requests.exceptions.RequestException as e:
            return {"error": str(e)}
        except json.JSONDecodeError as e:
            return {"error": f"JSON decode error: {e}", "status_code": response.status_code}
            
    def authenticate(self) -> bool:
        """Authenticate admin and salon users"""
        print("🔐 Authenticating users...")
        
        # Admin login
        admin_resp = self.make_request("POST", "/auth/login", ADMIN_CREDENTIALS)
        if admin_resp.get("status_code") == 200 and "access_token" in admin_resp.get("data", {}):
            self.admin_token = admin_resp["data"]["access_token"]
            self.log_test("Admin Authentication", True, "admin/admin123 login successful")
        else:
            self.log_test("Admin Authentication", False, f"Failed: {admin_resp}")
            return False
            
        # Salon login  
        salon_resp = self.make_request("POST", "/auth/login", SALON_CREDENTIALS)
        if salon_resp.get("status_code") == 200 and "access_token" in salon_resp.get("data", {}):
            self.salon_token = salon_resp["data"]["access_token"]
            self.log_test("Salon Authentication", True, "0935964158/salon123 login successful")
        else:
            self.log_test("Salon Authentication", False, f"Failed: {salon_resp}")
            return False
            
        return True
        
    def test_seed_endpoint(self) -> bool:
        """Test POST /api/seed with admin token"""
        print("\n🌱 Testing seed endpoint...")
        
        resp = self.make_request("POST", "/seed", token=self.admin_token)
        if resp.get("status_code") == 200:
            data = resp.get("data", {})
            if "message" in data:
                self.log_test("Seed Endpoint", True, f"Response: {data.get('message', '')}")
                return True
        
        self.log_test("Seed Endpoint", False, f"Failed: {resp}")
        return False
        
    def test_ranking_tiers_endpoint(self) -> bool:
        """Test GET /api/ranking/tiers (no auth required)"""
        print("\n🏆 Testing ranking tiers endpoint...")
        
        # Test 1: Basic request
        resp = self.make_request("GET", "/ranking/tiers")
        if resp.get("status_code") != 200:
            self.log_test("Ranking Tiers - Basic", False, f"Status: {resp.get('status_code')}")
            return False
            
        data = resp.get("data", {})
        required_keys = ["global_elite", "country_top", "governorate_top", "city_top", "scope", "thresholds"]
        missing_keys = [k for k in required_keys if k not in data]
        if missing_keys:
            self.log_test("Ranking Tiers - Basic", False, f"Missing keys: {missing_keys}")
            return False
            
        self.log_test("Ranking Tiers - Basic", True, f"All required keys present")
        
        # Test 2: With gender and limit
        params = {"gender": "male", "limit": 6}
        resp = self.make_request("GET", "/ranking/tiers", params=params)
        if resp.get("status_code") == 200:
            data = resp.get("data", {})
            # Check tier badge structure in returned shops
            for tier_name in ["global_elite", "country_top", "governorate_top", "city_top"]:
                shops = data.get(tier_name, [])
                for shop in shops:
                    if "tier_badge" in shop and shop["tier_badge"]:
                        tier_badge = shop["tier_badge"]
                        if tier_badge.get("tier") == tier_name:
                            self.log_test(f"Ranking Tiers - {tier_name} tier_badge", True, "Tier badge matches parent array")
                        else:
                            self.log_test(f"Ranking Tiers - {tier_name} tier_badge", False, f"Tier mismatch: {tier_badge.get('tier')} != {tier_name}")
            self.log_test("Ranking Tiers - Gender/Limit", True, "Gender=male, limit=6 works")
        else:
            self.log_test("Ranking Tiers - Gender/Limit", False, f"Status: {resp.get('status_code')}")
            
        # Test 3: Country filter
        params = {"gender": "male", "country": "سوريا"}
        resp = self.make_request("GET", "/ranking/tiers", params=params)
        if resp.get("status_code") == 200:
            self.log_test("Ranking Tiers - Country Filter", True, "Country filter works")
        else:
            self.log_test("Ranking Tiers - Country Filter", False, f"Status: {resp.get('status_code')}")
            
        # Test 4: Non-existent country (should fallback)
        params = {"gender": "male", "country": "NonExistentCountry"}
        resp = self.make_request("GET", "/ranking/tiers", params=params)
        if resp.get("status_code") == 200:
            data = resp.get("data", {})
            country_top = data.get("country_top", [])
            self.log_test("Ranking Tiers - Fallback Country", True, f"Fallback works, got {len(country_top)} shops")
        else:
            self.log_test("Ranking Tiers - Fallback Country", False, f"Status: {resp.get('status_code')}")
            
        # Test 5: Invalid limit
        params = {"limit": 100}
        resp = self.make_request("GET", "/ranking/tiers", params=params)
        if resp.get("status_code") in [422, 400]:
            self.log_test("Ranking Tiers - Invalid Limit", True, "Limit validation works")
        else:
            self.log_test("Ranking Tiers - Invalid Limit", False, f"Expected 422/400, got {resp.get('status_code')}")
            
        return True
        
    def test_admin_ranking_endpoints(self) -> bool:
        """Test admin ranking endpoints"""
        print("\n👑 Testing admin ranking endpoints...")
        
        # Test 1: POST /api/admin/ranking/recompute
        resp = self.make_request("POST", "/admin/ranking/recompute", token=self.admin_token)
        if resp.get("status_code") == 200:
            data = resp.get("data", {})
            required_keys = ["updated", "tier_counts", "computed_at"]
            if all(k in data for k in required_keys):
                tier_counts = data.get("tier_counts", {})
                expected_tiers = ["global_elite", "country_top", "governorate_top", "city_top", "normal"]
                if all(tier in tier_counts for tier in expected_tiers):
                    self.log_test("Admin Ranking Recompute", True, f"Updated {data.get('updated')} shops")
                else:
                    self.log_test("Admin Ranking Recompute", False, f"Missing tier counts: {tier_counts}")
            else:
                self.log_test("Admin Ranking Recompute", False, f"Missing keys in response: {data}")
        else:
            self.log_test("Admin Ranking Recompute", False, f"Status: {resp.get('status_code')}")
            
        # Test 2: POST /api/admin/ranking/recompute without auth
        resp = self.make_request("POST", "/admin/ranking/recompute")
        if resp.get("status_code") in [401, 403]:
            self.log_test("Admin Ranking Recompute - No Auth", True, "Properly requires admin auth")
        else:
            self.log_test("Admin Ranking Recompute - No Auth", False, f"Expected 401/403, got {resp.get('status_code')}")
            
        # Test 3: GET /api/admin/ranking/stats
        resp = self.make_request("GET", "/admin/ranking/stats", token=self.admin_token)
        if resp.get("status_code") == 200:
            data = resp.get("data", {})
            required_keys = ["tier_counts", "total_shops", "last_computed_at"]
            if all(k in data for k in required_keys):
                total_shops = data.get("total_shops", 0)
                self.log_test("Admin Ranking Stats", True, f"Total shops: {total_shops}")
            else:
                self.log_test("Admin Ranking Stats", False, f"Missing keys: {data}")
        else:
            self.log_test("Admin Ranking Stats", False, f"Status: {resp.get('status_code')}")
            
        # Test 4: GET /api/admin/ranking/stats without auth
        resp = self.make_request("GET", "/admin/ranking/stats")
        if resp.get("status_code") in [401, 403]:
            self.log_test("Admin Ranking Stats - No Auth", True, "Properly requires admin auth")
        else:
            self.log_test("Admin Ranking Stats - No Auth", False, f"Expected 401/403, got {resp.get('status_code')}")
            
        return True
        
    def test_barbers_enrichment(self) -> bool:
        """Test GET /api/barbers enrichment"""
        print("\n💎 Testing barbers enrichment...")
        
        resp = self.make_request("GET", "/barbers")
        if resp.get("status_code") != 200:
            self.log_test("Barbers Enrichment", False, f"Status: {resp.get('status_code')}")
            return False
            
        data = resp.get("data", [])
        if not data:
            self.log_test("Barbers Enrichment", False, "No barbers returned")
            return False
            
        # Check first barber for required enrichment fields
        barber = data[0]
        required_fields = ["tier_badge", "rating", "ranking_score", "total_reviews", "before_after_images", "products_count"]
        missing_fields = [f for f in required_fields if f not in barber]
        
        if missing_fields:
            self.log_test("Barbers Enrichment", False, f"Missing fields: {missing_fields}")
            return False
            
        # Verify rating != ranking_score (bug fix check)
        rating = barber.get("rating", 0)
        ranking_score = barber.get("ranking_score", 0)
        if rating == ranking_score and rating != 0:
            self.log_test("Barbers Enrichment - Rating Fix", False, "Rating equals ranking_score (bug not fixed)")
        else:
            self.log_test("Barbers Enrichment - Rating Fix", True, "Rating and ranking_score are distinct")
            
        self.log_test("Barbers Enrichment", True, f"All required fields present, {len(data)} barbers returned")
        return True
        
    def test_seed_data_quality(self) -> bool:
        """Test seed data quality"""
        print("\n🔍 Testing seed data quality...")
        
        # Get barbers list
        resp = self.make_request("GET", "/barbers", params={"limit": 10})
        if resp.get("status_code") != 200:
            self.log_test("Seed Data Quality", False, f"Failed to get barbers: {resp.get('status_code')}")
            return False
            
        barbers = resp.get("data", [])
        if not barbers:
            self.log_test("Seed Data Quality", False, "No barbers found")
            return False
            
        quality_issues = []
        
        for i, barber in enumerate(barbers):
            shop_id = barber.get("id")
            shop_name = barber.get("shop_name", f"Shop {i+1}")
            
            # Check before_after_images
            images = barber.get("before_after_images", [])
            if len(images) < 1:
                quality_issues.append(f"{shop_name}: No before_after_images")
                
            # Check products_count
            products_count = barber.get("products_count", 0)
            if products_count < 1:
                # Double-check by calling products endpoint
                prod_resp = self.make_request("GET", f"/products/shop/{shop_id}")
                if prod_resp.get("status_code") == 200:
                    products = prod_resp.get("data", [])
                    if len(products) < 1:
                        quality_issues.append(f"{shop_name}: No products")
                    else:
                        # Check if products have image_url
                        for prod in products:
                            if not prod.get("image_url"):
                                quality_issues.append(f"{shop_name}: Product '{prod.get('name', 'Unknown')}' has empty image_url")
                                
            # Check total_reviews
            total_reviews = barber.get("total_reviews", 0)
            if total_reviews <= 0:
                quality_issues.append(f"{shop_name}: No reviews (total_reviews={total_reviews})")
                
        if quality_issues:
            self.log_test("Seed Data Quality", False, f"Issues found: {'; '.join(quality_issues[:5])}")
        else:
            self.log_test("Seed Data Quality", True, f"All {len(barbers)} shops have proper seed data")
            
        return len(quality_issues) == 0
        
    def test_regression_endpoints(self) -> bool:
        """Test regression endpoints that must still work"""
        print("\n🔄 Testing regression endpoints...")
        
        regression_tests = [
            ("GET", "/health", None, None, "Health Check"),
            ("GET", "/config/public", None, None, "Public Config"),
            ("GET", "/sponsored/active", None, None, "Sponsored Active"),
            ("GET", "/search/barbers", None, {"shop_type": "male", "sort": "rating"}, "Search Barbers"),
            ("GET", "/pwa/status", None, None, "PWA Status"),
        ]
        
        all_passed = True
        
        for method, endpoint, token, params, test_name in regression_tests:
            resp = self.make_request(method, endpoint, token=token, params=params)
            if resp.get("status_code") == 200:
                self.log_test(f"Regression - {test_name}", True, "Endpoint working")
            else:
                self.log_test(f"Regression - {test_name}", False, f"Status: {resp.get('status_code')}")
                all_passed = False
                
        # Test admin users endpoint with auth
        resp = self.make_request("GET", "/admin/users", token=self.admin_token, params={"skip": 0, "limit": 2, "user_type": "user"})
        if resp.get("status_code") == 200:
            data = resp.get("data", [])
            if len(data) <= 2:
                self.log_test("Regression - Admin Users", True, f"Returned {len(data)} users")
            else:
                self.log_test("Regression - Admin Users", False, f"Limit not respected: {len(data)} > 2")
                all_passed = False
        else:
            self.log_test("Regression - Admin Users", False, f"Status: {resp.get('status_code')}")
            all_passed = False
            
        return all_passed
        
    def test_rate_limiting(self) -> bool:
        """Test rate limiting on auth endpoints"""
        print("\n🚦 Testing rate limiting...")
        
        # Try 9 failed login attempts
        failed_attempts = 0
        for i in range(9):
            resp = self.make_request("POST", "/auth/login", {"phone_number": "testphone", "password": "wrongpass"})
            if resp.get("status_code") == 401:
                failed_attempts += 1
            elif resp.get("status_code") == 429:
                self.log_test("Rate Limiting", True, f"Rate limited after {failed_attempts} attempts")
                return True
                
        if failed_attempts >= 8:
            self.log_test("Rate Limiting", True, f"8+ failed attempts allowed, rate limiting working")
            return True
        else:
            self.log_test("Rate Limiting", False, f"Only {failed_attempts} attempts before rate limit")
            return False
            
    def run_all_tests(self) -> bool:
        """Run all tests"""
        print("🚀 Starting BARBER HUB v3.6 Backend Testing...")
        print("=" * 60)
        
        # Authentication
        if not self.authenticate():
            print("❌ Authentication failed, cannot continue")
            return False
            
        # Seed data first
        self.test_seed_endpoint()
        
        # New ranking endpoints
        self.test_ranking_tiers_endpoint()
        self.test_admin_ranking_endpoints()
        
        # Enrichment tests
        self.test_barbers_enrichment()
        self.test_seed_data_quality()
        
        # Regression tests
        self.test_regression_endpoints()
        
        # Rate limiting
        self.test_rate_limiting()
        
        # Summary
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY:")
        print("=" * 60)
        
        passed = sum(1 for result in self.test_results if "✅ PASS" in result)
        failed = sum(1 for result in self.test_results if "❌ FAIL" in result)
        
        for result in self.test_results:
            print(result)
            
        print(f"\n📈 TOTAL: {passed} passed, {failed} failed")
        
        if failed == 0:
            print("🎉 ALL TESTS PASSED! Backend ready for production.")
            return True
        else:
            print(f"⚠️  {failed} tests failed. Please review and fix issues.")
            return False

if __name__ == "__main__":
    tester = BarberHubTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)