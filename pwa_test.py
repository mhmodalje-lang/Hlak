#!/usr/bin/env python3
"""
BARBER HUB PWA Backend API Testing Suite
Tests the 3 new PWA endpoints: /api/pwa/status, /api/push/vapid-public-key, /api/push/subscribe, /api/push/unsubscribe
"""

import requests
import json
import sys
from typing import Dict

# Configuration
BASE_URL = "https://security-audit-110.preview.emergentagent.com/api"

class PWATester:
    def __init__(self):
        self.session = requests.Session()
        self.test_results = []
        self.user_token = None
        
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
            elif method.upper() == "DELETE":
                response = self.session.delete(url, json=data, params=params, headers=headers, timeout=30)
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

    def register_and_login_user(self):
        """Register a new user and login to get token for auth tests"""
        # Register new user
        user_data = {
            "phone_number": "0501234567",
            "email": "testuser@example.com",
            "full_name": "Test User",
            "password": "testpass123",
            "gender": "male",
            "country": "Saudi Arabia",
            "city": "Riyadh"
        }
        
        # Try to register (might already exist)
        register_response = self.make_request("POST", "/auth/register", user_data)
        
        # Login with the user
        login_data = {
            "phone_number": "0501234567",
            "password": "testpass123"
        }
        
        login_response = self.make_request("POST", "/auth/login", login_data)
        
        if login_response.get("success"):
            self.user_token = login_response["data"]["access_token"]
            return True
        return False

    def test_pwa_status(self):
        """Test GET /api/pwa/status endpoint"""
        response = self.make_request("GET", "/pwa/status")
        
        if response.get("success") and response.get("status_code") == 200:
            data = response.get("data", {})
            
            # Check expected structure
            expected_fields = ["online", "version", "features"]
            missing_fields = [field for field in expected_fields if field not in data]
            
            if missing_fields:
                self.log_test("PWA Status Endpoint", False, 
                             f"Missing fields: {missing_fields}", response)
                return False
            
            # Check specific values
            if (data.get("online") == True and 
                data.get("version") == "3.1.0" and
                isinstance(data.get("features"), dict)):
                
                features = data.get("features", {})
                expected_features = ["push_enabled", "offline_support", "install_prompt"]
                missing_features = [f for f in expected_features if f not in features]
                
                if not missing_features:
                    self.log_test("PWA Status Endpoint", True, 
                                 f"Returned correct status: online={data['online']}, version={data['version']}")
                    return True
                else:
                    self.log_test("PWA Status Endpoint", False, 
                                 f"Missing features: {missing_features}", response)
                    return False
            else:
                self.log_test("PWA Status Endpoint", False, 
                             f"Incorrect values: online={data.get('online')}, version={data.get('version')}", response)
                return False
        else:
            self.log_test("PWA Status Endpoint", False, "Failed to get PWA status", response)
            return False

    def test_vapid_public_key(self):
        """Test GET /api/push/vapid-public-key endpoint"""
        response = self.make_request("GET", "/push/vapid-public-key")
        
        if response.get("success") and response.get("status_code") == 200:
            data = response.get("data", {})
            
            # Check expected structure
            if "public_key" in data and "enabled" in data:
                # Since VAPID_PUBLIC_KEY env is NOT set, should return empty key and false
                if data.get("public_key") == "" and data.get("enabled") == False:
                    self.log_test("VAPID Public Key Endpoint", True, 
                                 f"Correctly returned empty key and disabled status")
                    return True
                else:
                    self.log_test("VAPID Public Key Endpoint", False, 
                                 f"Expected empty key and disabled, got key='{data.get('public_key')}', enabled={data.get('enabled')}", response)
                    return False
            else:
                self.log_test("VAPID Public Key Endpoint", False, 
                             f"Missing required fields: public_key or enabled", response)
                return False
        else:
            self.log_test("VAPID Public Key Endpoint", False, "Failed to get VAPID public key", response)
            return False

    def test_push_subscribe_without_auth(self):
        """Test POST /api/push/subscribe without authentication"""
        subscription_data = {
            "subscription": {
                "endpoint": "https://fcm.googleapis.com/fcm/send/TEST_ENDPOINT_xyz",
                "keys": {
                    "p256dh": "test-p256dh",
                    "auth": "test-auth"
                }
            },
            "language": "ar"
        }
        
        response = self.make_request("POST", "/push/subscribe", subscription_data)
        
        if response.get("success") and response.get("status_code") == 200:
            data = response.get("data", {})
            
            if data.get("success") == True and "message" in data:
                self.log_test("Push Subscribe (No Auth)", True, 
                             f"Successfully stored subscription without auth: {data.get('message')}")
                return True
            else:
                self.log_test("Push Subscribe (No Auth)", False, 
                             f"Unexpected response structure", response)
                return False
        else:
            self.log_test("Push Subscribe (No Auth)", False, "Failed to subscribe without auth", response)
            return False

    def test_push_subscribe_with_auth(self):
        """Test POST /api/push/subscribe with authentication"""
        if not self.user_token:
            self.log_test("Push Subscribe (With Auth)", False, "No user token available")
            return False
            
        subscription_data = {
            "subscription": {
                "endpoint": "https://fcm.googleapis.com/fcm/send/TEST_ENDPOINT_auth_xyz",
                "keys": {
                    "p256dh": "test-p256dh-auth",
                    "auth": "test-auth-auth"
                }
            },
            "language": "en"
        }
        
        response = self.make_request("POST", "/push/subscribe", subscription_data, token=self.user_token)
        
        if response.get("success") and response.get("status_code") == 200:
            data = response.get("data", {})
            
            if data.get("success") == True and "message" in data:
                self.log_test("Push Subscribe (With Auth)", True, 
                             f"Successfully stored subscription with auth: {data.get('message')}")
                return True
            else:
                self.log_test("Push Subscribe (With Auth)", False, 
                             f"Unexpected response structure", response)
                return False
        else:
            self.log_test("Push Subscribe (With Auth)", False, "Failed to subscribe with auth", response)
            return False

    def test_push_subscribe_invalid_payload(self):
        """Test POST /api/push/subscribe with invalid payload"""
        # Test with empty payload
        response = self.make_request("POST", "/push/subscribe", {})
        
        if response.get("status_code") == 400:
            self.log_test("Push Subscribe (Invalid Payload)", True, 
                         f"Correctly returned 400 for invalid payload")
            return True
        else:
            self.log_test("Push Subscribe (Invalid Payload)", False, 
                         f"Expected 400, got {response.get('status_code')}", response)
            return False

    def test_push_subscribe_idempotency(self):
        """Test POST /api/push/subscribe idempotency (same endpoint twice)"""
        subscription_data = {
            "subscription": {
                "endpoint": "https://fcm.googleapis.com/fcm/send/TEST_ENDPOINT_idempotent",
                "keys": {
                    "p256dh": "test-p256dh-idem",
                    "auth": "test-auth-idem"
                }
            },
            "language": "ar"
        }
        
        # First subscription
        response1 = self.make_request("POST", "/push/subscribe", subscription_data)
        
        # Second subscription with same endpoint
        response2 = self.make_request("POST", "/push/subscribe", subscription_data)
        
        if (response1.get("success") and response1.get("status_code") == 200 and
            response2.get("success") and response2.get("status_code") == 200):
            
            data1 = response1.get("data", {})
            data2 = response2.get("data", {})
            
            if (data1.get("success") == True and data2.get("success") == True):
                self.log_test("Push Subscribe (Idempotency)", True, 
                             f"Both requests succeeded (upsert behavior)")
                return True
            else:
                self.log_test("Push Subscribe (Idempotency)", False, 
                             f"One or both requests failed", {"response1": response1, "response2": response2})
                return False
        else:
            self.log_test("Push Subscribe (Idempotency)", False, 
                         f"Expected both to return 200", {"response1": response1, "response2": response2})
            return False

    def test_push_unsubscribe(self):
        """Test DELETE /api/push/unsubscribe endpoint"""
        unsubscribe_data = {
            "endpoint": "https://fcm.googleapis.com/fcm/send/TEST_ENDPOINT_xyz"
        }
        
        response = self.make_request("DELETE", "/push/unsubscribe", unsubscribe_data)
        
        if response.get("success") and response.get("status_code") == 200:
            data = response.get("data", {})
            
            if data.get("success") == True:
                self.log_test("Push Unsubscribe", True, 
                             f"Successfully unsubscribed")
                return True
            else:
                self.log_test("Push Unsubscribe", False, 
                             f"Unexpected response structure", response)
                return False
        else:
            self.log_test("Push Unsubscribe", False, "Failed to unsubscribe", response)
            return False

    def test_push_unsubscribe_missing_endpoint(self):
        """Test DELETE /api/push/unsubscribe with missing endpoint"""
        response = self.make_request("DELETE", "/push/unsubscribe", {})
        
        if response.get("status_code") == 400:
            self.log_test("Push Unsubscribe (Missing Endpoint)", True, 
                         f"Correctly returned 400 for missing endpoint")
            return True
        else:
            self.log_test("Push Unsubscribe (Missing Endpoint)", False, 
                         f"Expected 400, got {response.get('status_code')}", response)
            return False

    def run_all_tests(self):
        """Run all PWA tests in sequence"""
        print("🚀 Starting BARBER HUB PWA Backend API Tests")
        print("=" * 60)
        
        # Setup user authentication for auth tests
        print("Setting up user authentication...")
        auth_setup = self.register_and_login_user()
        if auth_setup:
            print("✅ User authentication setup successful")
        else:
            print("⚠️ User authentication setup failed - will skip auth tests")
        print()
        
        # PWA Status endpoint
        self.test_pwa_status()
        
        # VAPID Public Key endpoint
        self.test_vapid_public_key()
        
        # Push Subscribe endpoints
        self.test_push_subscribe_without_auth()
        if auth_setup:
            self.test_push_subscribe_with_auth()
        self.test_push_subscribe_invalid_payload()
        self.test_push_subscribe_idempotency()
        
        # Push Unsubscribe endpoints
        self.test_push_unsubscribe()
        self.test_push_unsubscribe_missing_endpoint()
        
        # Summary
        print("=" * 60)
        print("📊 PWA TEST SUMMARY")
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
        else:
            print("\n🎉 ALL PWA ENDPOINTS WORKING CORRECTLY!")
        
        return passed == total

if __name__ == "__main__":
    tester = PWATester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)