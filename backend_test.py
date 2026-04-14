#!/usr/bin/env python3
"""
BARBER HUB Backend API Testing
Tests all the core API endpoints for the barber booking platform
"""

import requests
import sys
import json
from datetime import datetime

class BarberHubAPITester:
    def __init__(self, base_url="https://salon-connect-104.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.admin_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            print(f"❌ {name} - {details}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details
        })

    def test_api_root(self):
        """Test the root API endpoint"""
        try:
            response = requests.get(f"{self.api_url}/")
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            if success:
                data = response.json()
                details += f", Message: {data.get('message', 'N/A')}"
            self.log_test("API Root Endpoint", success, details)
            return success
        except Exception as e:
            self.log_test("API Root Endpoint", False, str(e))
            return False

    def test_countries_endpoint(self):
        """Test countries endpoint"""
        try:
            response = requests.get(f"{self.api_url}/locations/countries")
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            if success:
                data = response.json()
                countries = data.get('countries', [])
                details += f", Countries count: {len(countries)}"
            self.log_test("Countries Endpoint", success, details)
            return success
        except Exception as e:
            self.log_test("Countries Endpoint", False, str(e))
            return False

    def test_barbers_endpoint(self):
        """Test barbers endpoint (should return empty array initially)"""
        try:
            response = requests.get(f"{self.api_url}/barbers")
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            if success:
                data = response.json()
                details += f", Barbers count: {len(data)}"
            self.log_test("Barbers Endpoint", success, details)
            return success
        except Exception as e:
            self.log_test("Barbers Endpoint", False, str(e))
            return False

    def test_admin_login(self):
        """Test admin login with credentials from test_credentials.md"""
        try:
            login_data = {
                "phone": "admin",
                "password": "admin123"
            }
            response = requests.post(f"{self.api_url}/auth/login", json=login_data)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                self.admin_token = data.get('access_token')
                user = data.get('user', {})
                details += f", User type: {user.get('user_type')}, Name: {user.get('name')}"
            else:
                details += f", Error: {response.text}"
                
            self.log_test("Admin Login", success, details)
            return success
        except Exception as e:
            self.log_test("Admin Login", False, str(e))
            return False

    def test_user_registration(self):
        """Test user registration"""
        try:
            # Use test credentials from test_credentials.md
            register_data = {
                "phone": "+963935964158",
                "password": "test123",
                "name": "محمد",
                "country": "SY",
                "city": "الحسكة",
                "gender": "male",
                "user_type": "customer"
            }
            response = requests.post(f"{self.api_url}/auth/register", json=register_data)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                self.token = data.get('access_token')
                user = data.get('user', {})
                details += f", User ID: {user.get('id')}, Type: {user.get('user_type')}"
            else:
                # Check if user already exists
                if response.status_code == 400 and "already registered" in response.text:
                    # Try to login instead
                    login_data = {
                        "phone": "+963935964158",
                        "password": "test123"
                    }
                    login_response = requests.post(f"{self.api_url}/auth/login", json=login_data)
                    if login_response.status_code == 200:
                        data = login_response.json()
                        self.token = data.get('access_token')
                        success = True
                        details = f"User exists, logged in instead. Status: {login_response.status_code}"
                    else:
                        details += f", Login failed: {login_response.text}"
                else:
                    details += f", Error: {response.text}"
                
            self.log_test("User Registration/Login", success, details)
            return success
        except Exception as e:
            self.log_test("User Registration/Login", False, str(e))
            return False

    def test_cities_endpoint(self):
        """Test cities endpoint for Syria"""
        try:
            response = requests.get(f"{self.api_url}/locations/cities/SY")
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            if success:
                data = response.json()
                cities = data.get('cities', [])
                details += f", Cities count: {len(cities)}"
            self.log_test("Cities Endpoint (Syria)", success, details)
            return success
        except Exception as e:
            self.log_test("Cities Endpoint (Syria)", False, str(e))
            return False

    def test_protected_endpoint(self):
        """Test a protected endpoint with authentication"""
        if not self.token:
            self.log_test("Protected Endpoint Test", False, "No auth token available")
            return False
            
        try:
            headers = {"Authorization": f"Bearer {self.token}"}
            response = requests.get(f"{self.api_url}/auth/me", headers=headers)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            if success:
                data = response.json()
                details += f", User: {data.get('name')}, Type: {data.get('user_type')}"
            else:
                details += f", Error: {response.text}"
            self.log_test("Protected Endpoint (/auth/me)", success, details)
            return success
        except Exception as e:
            self.log_test("Protected Endpoint (/auth/me)", False, str(e))
            return False

    def run_all_tests(self):
        """Run all backend tests"""
        print("🚀 Starting BARBER HUB Backend API Tests...")
        print(f"🌐 Testing against: {self.base_url}")
        print("=" * 60)
        
        # Core API tests
        self.test_api_root()
        self.test_countries_endpoint()
        self.test_cities_endpoint()
        self.test_barbers_endpoint()
        
        # Authentication tests
        self.test_admin_login()
        self.test_user_registration()
        self.test_protected_endpoint()
        
        # Summary
        print("=" * 60)
        print(f"📊 Tests completed: {self.tests_passed}/{self.tests_run} passed")
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        print(f"📈 Success rate: {success_rate:.1f}%")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return 0
        else:
            print("⚠️  Some tests failed. Check the details above.")
            return 1

def main():
    tester = BarberHubAPITester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())