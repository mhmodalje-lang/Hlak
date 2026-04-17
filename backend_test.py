#!/usr/bin/env python3
"""
BARBER HUB Backend API Testing Suite
Tests all critical endpoints including new seed data, WhatsApp integration, and enriched barber listings.
"""

import requests
import json
import sys
from datetime import datetime, timedelta
from typing import Dict, List, Optional

# Configuration
BASE_URL = "https://tech-state-doc.preview.emergentagent.com/api"
ADMIN_CREDENTIALS = {"phone_number": "admin", "password": "admin123"}
SALON_CREDENTIALS = {"phone_number": "0935964158", "password": "salon123"}

class BarberHubTester:
    def __init__(self):
        self.session = requests.Session()
        self.admin_token = None
        self.salon_token = None
        self.test_results = []
        self.first_male_shop_id = None
        
    def log_test(self, test_name: str, success: bool, details: str = "", response_data: Dict = None):
        """Log test results"""
        status = "✅ PASS" if success else "❌ FAIL"
        result = {
            "test": test_name,
            "status": status,
            "success": success,
            "details": details,
            "response_data": response_data
        }
        self.test_results.append(result)
        print(f"{status} - {test_name}")
        if details:
            print(f"    Details: {details}")
        if not success and response_data:
            print(f"    Response: {json.dumps(response_data, indent=2)}")
        print()

    def make_request(self, method: str, endpoint: str, data: Dict = None, params: Dict = None, token: str = None) -> Dict:
        """Make HTTP request with proper error handling"""
        url = f"{BASE_URL}{endpoint}"
        headers = {"Content-Type": "application/json"}
        
        if token:
            headers["Authorization"] = f"Bearer {token}"
            
        try:
            if method.upper() == "GET":
                response = self.session.get(url, params=params, headers=headers, timeout=30)
            elif method.upper() == "POST":
                response = self.session.post(url, json=data, params=params, headers=headers, timeout=30)
            elif method.upper() == "PUT":
                response = self.session.put(url, json=data, params=params, headers=headers, timeout=30)
            elif method.upper() == "DELETE":
                response = self.session.delete(url, params=params, headers=headers, timeout=30)
            else:
                return {"error": f"Unsupported method: {method}"}
                
            return {
                "status_code": response.status_code,
                "data": response.json() if response.content else {},
                "success": 200 <= response.status_code < 300
            }
        except requests.exceptions.Timeout:
            return {"error": "Request timeout", "status_code": 408}
        except requests.exceptions.ConnectionError:
            return {"error": "Connection error", "status_code": 0}
        except Exception as e:
            return {"error": str(e), "status_code": 500}

    def test_admin_login(self):
        """Test admin authentication"""
        response = self.make_request("POST", "/auth/login", ADMIN_CREDENTIALS)
        
        if response.get("success") and response.get("data", {}).get("user_type") == "admin":
            self.admin_token = response["data"]["access_token"]
            self.log_test("Admin Login", True, f"Admin authenticated successfully")
            return True
        else:
            self.log_test("Admin Login", False, f"Failed to authenticate admin", response)
            return False

    def test_salon_login(self):
        """Test salon owner authentication"""
        response = self.make_request("POST", "/auth/login", SALON_CREDENTIALS)
        
        if response.get("success") and response.get("data", {}).get("user_type") == "barbershop":
            self.salon_token = response["data"]["access_token"]
            user_data = response["data"].get("user", {})
            self.log_test("Salon Owner Login", True, 
                         f"Salon owner authenticated: {user_data.get('shop_name', 'Unknown')}")
            return True
        else:
            self.log_test("Salon Owner Login", False, f"Failed to authenticate salon owner", response)
            return False

    def test_seed_data_injection(self):
        """Test POST /api/seed endpoint"""
        response = self.make_request("POST", "/seed")
        
        if response.get("success"):
            data = response.get("data", {})
            shops_created = data.get("shops_created", 0)
            barbershop_count = data.get("barbershop_count", 0)
            test_credentials = data.get("test_credentials", {})
            message = data.get("message", "")
            
            # Handle both new seeding and existing data scenarios
            if "already exists" in message and barbershop_count >= 10:
                self.log_test("Seed Data Injection", True, 
                             f"Seed data already exists with {barbershop_count} barbershops")
                return True
            elif shops_created == 10 and test_credentials:
                self.log_test("Seed Data Injection", True, 
                             f"Created {shops_created} barbershops with test credentials")
                return True
            else:
                self.log_test("Seed Data Injection", False, 
                             f"Expected 10 shops or existing data, got {shops_created} created, {barbershop_count} total", response)
                return False
        else:
            self.log_test("Seed Data Injection", False, "Seed endpoint failed", response)
            return False

    def test_whatsapp_link_generator(self):
        """Test GET /api/generate-booking-link endpoint"""
        params = {
            "shop_phone": "0935964158",
            "customer_name": "أحمد محمد",
            "service": "قص شعر",
            "time": "14:00",
            "date": "2024-12-20",
            "shop_name": "صالون الأناقة الملكية"
        }
        
        response = self.make_request("GET", "/generate-booking-link", params=params)
        
        if response.get("success"):
            data = response.get("data", {})
            whatsapp_url = data.get("whatsapp_url") or data.get("url", "")
            message = data.get("message", "")
            
            # Check if URL is valid wa.me format and contains customer name in message
            if whatsapp_url.startswith("https://wa.me/") and "أحمد محمد" in message:
                self.log_test("WhatsApp Link Generator", True, 
                             f"Generated WhatsApp URL with Arabic message")
                return True
            else:
                self.log_test("WhatsApp Link Generator", False, 
                             f"Invalid WhatsApp URL format or missing customer name", response)
                return False
        else:
            self.log_test("WhatsApp Link Generator", False, "WhatsApp link generation failed", response)
            return False

    def test_enriched_barber_listing_male(self):
        """Test GET /api/barbers?type=male endpoint"""
        response = self.make_request("GET", "/barbers", params={"type": "male"})
        
        if response.get("success"):
            data = response.get("data", [])
            
            if len(data) == 5:
                # Check first shop for enrichment
                first_shop = data[0]
                self.first_male_shop_id = first_shop.get("id")
                
                required_fields = ["services", "rating", "whatsapp", "instagram", "ranking_tier"]
                missing_fields = [field for field in required_fields if field not in first_shop]
                
                if not missing_fields:
                    # Check if sorted by rating
                    ratings = [shop.get("rating", 0) for shop in data]
                    is_sorted = all(ratings[i] >= ratings[i+1] for i in range(len(ratings)-1))
                    
                    if is_sorted:
                        self.log_test("Enriched Barber Listing (Male)", True, 
                                     f"Returned 5 male shops, properly enriched and sorted by rating")
                        return True
                    else:
                        self.log_test("Enriched Barber Listing (Male)", False, 
                                     f"Shops not sorted by rating: {ratings}")
                        return False
                else:
                    self.log_test("Enriched Barber Listing (Male)", False, 
                                 f"Missing enrichment fields: {missing_fields}", response)
                    return False
            else:
                self.log_test("Enriched Barber Listing (Male)", False, 
                             f"Expected 5 male shops, got {len(data)}", response)
                return False
        else:
            self.log_test("Enriched Barber Listing (Male)", False, "Failed to get male barbers", response)
            return False

    def test_enriched_barber_listing_female(self):
        """Test GET /api/barbers?type=female endpoint"""
        response = self.make_request("GET", "/barbers", params={"type": "female"})
        
        if response.get("success"):
            data = response.get("data", [])
            
            if len(data) == 5:
                # Check enrichment
                first_shop = data[0]
                required_fields = ["services", "rating", "whatsapp", "instagram"]
                missing_fields = [field for field in required_fields if field not in first_shop]
                
                if not missing_fields:
                    self.log_test("Enriched Barber Listing (Female)", True, 
                                 f"Returned 5 female salons, properly enriched")
                    return True
                else:
                    self.log_test("Enriched Barber Listing (Female)", False, 
                                 f"Missing enrichment fields: {missing_fields}", response)
                    return False
            else:
                self.log_test("Enriched Barber Listing (Female)", False, 
                             f"Expected 5 female salons, got {len(data)}", response)
                return False
        else:
            self.log_test("Enriched Barber Listing (Female)", False, "Failed to get female salons", response)
            return False

    def test_booking_schedule_conflict(self):
        """Test GET /api/bookings/barber/{id}/schedule?date=TOMORROW"""
        if not self.first_male_shop_id:
            self.log_test("Booking Schedule Conflict", False, "No male shop ID available for testing")
            return False
            
        tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        endpoint = f"/bookings/barber/{self.first_male_shop_id}/schedule"
        
        response = self.make_request("GET", endpoint, params={"date": tomorrow})
        
        if response.get("success"):
            data = response.get("data", {})
            booked_times = data.get("booked_times", [])
            
            expected_times = ["14:00", "16:00"]
            if all(time in booked_times for time in expected_times):
                self.log_test("Booking Schedule Conflict", True, 
                             f"Found expected booked times: {booked_times}")
                return True
            else:
                self.log_test("Booking Schedule Conflict", False, 
                             f"Expected {expected_times}, got {booked_times}", response)
                return False
        else:
            self.log_test("Booking Schedule Conflict", False, "Failed to get booking schedule", response)
            return False

    def test_admin_stats(self):
        """Test admin dashboard stats"""
        if not self.admin_token:
            self.log_test("Admin Stats", False, "No admin token available")
            return False
            
        response = self.make_request("GET", "/admin/stats", token=self.admin_token)
        
        if response.get("success"):
            data = response.get("data", {})
            total_barbershops = data.get("total_barbershops", 0)
            
            if total_barbershops >= 10:
                self.log_test("Admin Stats", True, 
                             f"Admin stats show {total_barbershops} barbershops")
                return True
            else:
                self.log_test("Admin Stats", False, 
                             f"Expected at least 10 barbershops, got {total_barbershops}", response)
                return False
        else:
            self.log_test("Admin Stats", False, "Failed to get admin stats", response)
            return False

    def test_reviews_count(self):
        """Test that reviews were created during seeding"""
        if not self.first_male_shop_id:
            self.log_test("Reviews Count", False, "No male shop ID available for testing")
            return False
            
        endpoint = f"/reviews/barber/{self.first_male_shop_id}"
        response = self.make_request("GET", endpoint)
        
        if response.get("success"):
            data = response.get("data", [])
            
            if len(data) >= 10:  # Should have many reviews from seeding
                self.log_test("Reviews Count", True, 
                             f"Found {len(data)} reviews for first male shop")
                return True
            else:
                self.log_test("Reviews Count", False, 
                             f"Expected at least 10 reviews, got {len(data)}", response)
                return False
        else:
            self.log_test("Reviews Count", False, "Failed to get reviews", response)
            return False

    def run_all_tests(self):
        """Run all tests in sequence"""
        print("🚀 Starting BARBER HUB Backend API Tests")
        print("=" * 60)
        
        # Authentication tests
        admin_login_success = self.test_admin_login()
        salon_login_success = self.test_salon_login()
        
        # Core functionality tests
        self.test_seed_data_injection()
        self.test_whatsapp_link_generator()
        self.test_enriched_barber_listing_male()
        self.test_enriched_barber_listing_female()
        self.test_booking_schedule_conflict()
        
        # Admin and reviews tests
        if admin_login_success:
            self.test_admin_stats()
        
        self.test_reviews_count()
        
        # Summary
        print("=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        
        passed = sum(1 for result in self.test_results if result["success"])
        total = len(self.test_results)
        
        print(f"Total Tests: {total}")
        print(f"Passed: {passed}")
        print(f"Failed: {total - passed}")
        print(f"Success Rate: {(passed/total)*100:.1f}%")
        
        print("\n📋 DETAILED RESULTS:")
        for result in self.test_results:
            print(f"{result['status']} - {result['test']}")
            if result['details']:
                print(f"    {result['details']}")
        
        # Critical issues
        failed_tests = [r for r in self.test_results if not r["success"]]
        if failed_tests:
            print("\n🚨 CRITICAL ISSUES:")
            for test in failed_tests:
                print(f"❌ {test['test']}: {test['details']}")
        
        return passed == total

if __name__ == "__main__":
    tester = BarberHubTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)