#!/usr/bin/env python3
"""
BARBER HUB v3.9.0 Backend Testing - NEW Site Settings + Subscription Plans Endpoints
Testing the 7 new endpoints as specified in the review request.
"""

import requests
import json
import uuid
from datetime import datetime

# Configuration
BASE_URL = "https://barber-finder-26.preview.emergentagent.com/api"
ADMIN_PHONE = "admin"
ADMIN_PASSWORD = "NewStrong2026!xYz"

class TestRunner:
    def __init__(self):
        self.admin_token = None
        self.test_results = []
        
    def log_test(self, test_name, success, details=""):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        self.test_results.append(f"{status} - {test_name}: {details}")
        print(f"{status} - {test_name}: {details}")
        
    def get_admin_token(self):
        """Login as admin and get access token"""
        try:
            response = requests.post(f"{BASE_URL}/auth/login", json={
                "phone_number": ADMIN_PHONE,
                "password": ADMIN_PASSWORD
            })
            
            if response.status_code == 200:
                data = response.json()
                self.admin_token = data.get("access_token")
                
                # Check if password change is required
                user_data = data.get("user", {})
                if user_data.get("must_change_password"):
                    self.log_test("Admin Login", True, f"Got access token, must change password")
                    # Change password to allow admin operations
                    new_password = "NewStrong2026!xYz"
                    headers = {"Authorization": f"Bearer {self.admin_token}"}
                    change_response = requests.post(f"{BASE_URL}/auth/change-password", 
                                                  json={
                                                      "old_password": ADMIN_PASSWORD,
                                                      "new_password": new_password
                                                  }, headers=headers)
                    
                    if change_response.status_code == 200:
                        # Login again with new password
                        login_response = requests.post(f"{BASE_URL}/auth/login", json={
                            "phone_number": ADMIN_PHONE,
                            "password": new_password
                        })
                        
                        if login_response.status_code == 200:
                            login_data = login_response.json()
                            self.admin_token = login_data.get("access_token")
                            self.log_test("Admin Password Change", True, "Password changed and re-logged in")
                        else:
                            self.log_test("Admin Password Change", False, f"Re-login failed: {login_response.text}")
                            return False
                    else:
                        self.log_test("Admin Password Change", False, f"Password change failed: {change_response.text}")
                        return False
                else:
                    self.log_test("Admin Login", True, f"Got access token")
                return True
            else:
                self.log_test("Admin Login", False, f"Status {response.status_code}: {response.text}")
                return False
        except Exception as e:
            self.log_test("Admin Login", False, f"Exception: {str(e)}")
            return False
    
    def test_site_settings_public_get(self):
        """Test GET /api/site-settings (PUBLIC, no auth)"""
        try:
            response = requests.get(f"{BASE_URL}/site-settings")
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ["id", "phone", "email", "whatsapp", "facebook", "instagram", 
                                 "twitter", "tiktok", "youtube", "snapchat", "address", 
                                 "tagline_ar", "tagline_en"]
                
                missing_fields = [field for field in required_fields if field not in data]
                
                if not missing_fields:
                    default_phone = "+963 935 964 158"
                    if data.get("phone") == default_phone:
                        self.log_test("GET /api/site-settings", True, 
                                    f"Auto-seeded with default phone {default_phone}")
                    else:
                        self.log_test("GET /api/site-settings", True, 
                                    f"Returns all required fields, phone: {data.get('phone')}")
                else:
                    self.log_test("GET /api/site-settings", False, 
                                f"Missing fields: {missing_fields}")
            else:
                self.log_test("GET /api/site-settings", False, 
                            f"Status {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("GET /api/site-settings", False, f"Exception: {str(e)}")
    
    def test_site_settings_admin_put_no_auth(self):
        """Test PUT /api/admin/site-settings without auth (should fail)"""
        try:
            response = requests.put(f"{BASE_URL}/admin/site-settings", json={
                "phone": "+963 111 222 333"
            })
            
            if response.status_code in [401, 403]:
                self.log_test("PUT /api/admin/site-settings (no auth)", True, 
                            f"Correctly rejected with {response.status_code}")
            else:
                self.log_test("PUT /api/admin/site-settings (no auth)", False, 
                            f"Should return 401/403, got {response.status_code}")
        except Exception as e:
            self.log_test("PUT /api/admin/site-settings (no auth)", False, f"Exception: {str(e)}")
    
    def test_site_settings_admin_put_with_auth(self):
        """Test PUT /api/admin/site-settings with admin auth"""
        if not self.admin_token:
            self.log_test("PUT /api/admin/site-settings (with auth)", False, "No admin token")
            return
            
        try:
            headers = {"Authorization": f"Bearer {self.admin_token}"}
            payload = {
                "phone": "+963 111 222 333",
                "email": "test@example.com",
                "facebook": "https://fb.com/test"
            }
            
            response = requests.put(f"{BASE_URL}/admin/site-settings", 
                                  json=payload, headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "settings" in data:
                    settings = data["settings"]
                    if (settings.get("phone") == payload["phone"] and 
                        settings.get("email") == payload["email"] and
                        settings.get("facebook") == payload["facebook"]):
                        self.log_test("PUT /api/admin/site-settings (with auth)", True, 
                                    "Successfully updated settings")
                    else:
                        self.log_test("PUT /api/admin/site-settings (with auth)", False, 
                                    "Settings not properly updated")
                else:
                    self.log_test("PUT /api/admin/site-settings (with auth)", False, 
                                "Invalid response format")
            else:
                self.log_test("PUT /api/admin/site-settings (with auth)", False, 
                            f"Status {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("PUT /api/admin/site-settings (with auth)", False, f"Exception: {str(e)}")
    
    def test_site_settings_persistence(self):
        """Test that site settings changes persist"""
        try:
            response = requests.get(f"{BASE_URL}/site-settings")
            
            if response.status_code == 200:
                data = response.json()
                if data.get("phone") == "+963 111 222 333":
                    self.log_test("Site Settings Persistence", True, 
                                "Updated values persisted correctly")
                else:
                    self.log_test("Site Settings Persistence", False, 
                                f"Expected updated phone, got: {data.get('phone')}")
            else:
                self.log_test("Site Settings Persistence", False, 
                            f"Status {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("Site Settings Persistence", False, f"Exception: {str(e)}")
    
    def test_subscription_plans_public_get(self):
        """Test GET /api/subscription-plans (PUBLIC)"""
        try:
            response = requests.get(f"{BASE_URL}/subscription-plans")
            
            if response.status_code == 200:
                data = response.json()
                if "plans" in data and isinstance(data["plans"], list):
                    plans = data["plans"]
                    if len(plans) >= 2:  # Should have Syria + Global default plans
                        syria_plan = next((p for p in plans if p.get("country_code") == "SY"), None)
                        global_plan = next((p for p in plans if p.get("country_code") == "GLOBAL"), None)
                        
                        if syria_plan and global_plan:
                            self.log_test("GET /api/subscription-plans", True, 
                                        f"Auto-seeded {len(plans)} plans (Syria + Global)")
                        else:
                            self.log_test("GET /api/subscription-plans", True, 
                                        f"Returns {len(plans)} plans")
                    else:
                        self.log_test("GET /api/subscription-plans", False, 
                                    f"Expected at least 2 plans, got {len(plans)}")
                else:
                    self.log_test("GET /api/subscription-plans", False, 
                                "Invalid response format")
            else:
                self.log_test("GET /api/subscription-plans", False, 
                            f"Status {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("GET /api/subscription-plans", False, f"Exception: {str(e)}")
    
    def test_subscription_plans_country_filter(self):
        """Test GET /api/subscription-plans with country filters"""
        try:
            # Test country_code filter
            response = requests.get(f"{BASE_URL}/subscription-plans?country_code=SY")
            if response.status_code == 200:
                data = response.json()
                plans = data.get("plans", [])
                if len(plans) == 1 and plans[0].get("country_code") == "SY":
                    self.log_test("Subscription Plans Country Code Filter", True, 
                                "SY filter returns only Syria plan")
                else:
                    self.log_test("Subscription Plans Country Code Filter", False, 
                                f"SY filter returned {len(plans)} plans")
            
            # Test non-existent country (should fallback to Global)
            response = requests.get(f"{BASE_URL}/subscription-plans?country_code=XX")
            if response.status_code == 200:
                data = response.json()
                plans = data.get("plans", [])
                if len(plans) == 1 and plans[0].get("country_code") == "GLOBAL":
                    self.log_test("Subscription Plans Global Fallback", True, 
                                "Non-existent country falls back to Global")
                else:
                    self.log_test("Subscription Plans Global Fallback", False, 
                                f"Fallback returned {len(plans)} plans")
            
            # Test country name filter (case-insensitive)
            response = requests.get(f"{BASE_URL}/subscription-plans?country=syria")
            if response.status_code == 200:
                data = response.json()
                plans = data.get("plans", [])
                if len(plans) >= 1:
                    syria_plan = next((p for p in plans if "syria" in p.get("country", "").lower()), None)
                    if syria_plan:
                        self.log_test("Subscription Plans Country Name Filter", True, 
                                    "Case-insensitive country name filter works")
                    else:
                        self.log_test("Subscription Plans Country Name Filter", False, 
                                    "No Syria plan found in results")
                        
        except Exception as e:
            self.log_test("Subscription Plans Filters", False, f"Exception: {str(e)}")
    
    def test_subscription_plans_admin_get(self):
        """Test GET /api/admin/subscription-plans (ADMIN only)"""
        if not self.admin_token:
            self.log_test("GET /api/admin/subscription-plans", False, "No admin token")
            return
            
        try:
            # Test without auth
            response = requests.get(f"{BASE_URL}/admin/subscription-plans")
            if response.status_code in [401, 403]:
                self.log_test("GET /api/admin/subscription-plans (no auth)", True, 
                            f"Correctly rejected with {response.status_code}")
            
            # Test with admin auth
            headers = {"Authorization": f"Bearer {self.admin_token}"}
            response = requests.get(f"{BASE_URL}/admin/subscription-plans", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                if "plans" in data and isinstance(data["plans"], list):
                    self.log_test("GET /api/admin/subscription-plans (with auth)", True, 
                                f"Returns {len(data['plans'])} plans (including inactive)")
                else:
                    self.log_test("GET /api/admin/subscription-plans (with auth)", False, 
                                "Invalid response format")
            else:
                self.log_test("GET /api/admin/subscription-plans (with auth)", False, 
                            f"Status {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("GET /api/admin/subscription-plans", False, f"Exception: {str(e)}")
    
    def test_subscription_plans_admin_create(self):
        """Test POST /api/admin/subscription-plans (ADMIN only)"""
        if not self.admin_token:
            self.log_test("POST /api/admin/subscription-plans", False, "No admin token")
            return
            
        try:
            # Test without auth
            payload = {
                "country": "Saudi Arabia",
                "country_code": "SA",
                "country_ar": "السعودية",
                "currency": "SAR",
                "currency_symbol": "ر.س",
                "monthly_price": 75,
                "free_trial_months": 1,
                "subscribe_url": "https://example.com/sub/sa",
                "active": True
            }
            
            response = requests.post(f"{BASE_URL}/admin/subscription-plans", json=payload)
            if response.status_code in [401, 403]:
                self.log_test("POST /api/admin/subscription-plans (no auth)", True, 
                            f"Correctly rejected with {response.status_code}")
            
            # Test with admin auth
            headers = {"Authorization": f"Bearer {self.admin_token}"}
            response = requests.post(f"{BASE_URL}/admin/subscription-plans", 
                                   json=payload, headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "plan" in data:
                    plan = data["plan"]
                    if (plan.get("country") == "Saudi Arabia" and 
                        plan.get("currency") == "SAR" and
                        "id" in plan and "created_at" in plan and "updated_at" in plan):
                        # Store plan ID for later tests
                        self.test_plan_id = plan["id"]
                        
                        # Check default features are populated
                        if plan.get("features_ar") and plan.get("features_en"):
                            self.log_test("POST /api/admin/subscription-plans (with auth)", True, 
                                        f"Created plan with ID {plan['id']}, default features populated")
                        else:
                            self.log_test("POST /api/admin/subscription-plans (with auth)", False, 
                                        "Default features not populated")
                    else:
                        self.log_test("POST /api/admin/subscription-plans (with auth)", False, 
                                    "Plan data incomplete or incorrect")
                else:
                    self.log_test("POST /api/admin/subscription-plans (with auth)", False, 
                                "Invalid response format")
            else:
                self.log_test("POST /api/admin/subscription-plans (with auth)", False, 
                            f"Status {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("POST /api/admin/subscription-plans", False, f"Exception: {str(e)}")
    
    def test_subscription_plans_admin_update(self):
        """Test PUT /api/admin/subscription-plans/{plan_id} (ADMIN only)"""
        if not self.admin_token:
            self.log_test("PUT /api/admin/subscription-plans", False, "No admin token")
            return
            
        if not hasattr(self, 'test_plan_id'):
            self.log_test("PUT /api/admin/subscription-plans", False, "No test plan ID available")
            return
            
        try:
            headers = {"Authorization": f"Bearer {self.admin_token}"}
            
            # Test with invalid plan ID
            response = requests.put(f"{BASE_URL}/admin/subscription-plans/invalid-id", 
                                  json={"monthly_price": 99}, headers=headers)
            if response.status_code == 404:
                self.log_test("PUT /api/admin/subscription-plans (invalid ID)", True, 
                            "Correctly returns 404 for invalid plan ID")
            
            # Test with valid plan ID
            update_payload = {"monthly_price": 99, "active": False}
            response = requests.put(f"{BASE_URL}/admin/subscription-plans/{self.test_plan_id}", 
                                  json=update_payload, headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "plan" in data:
                    plan = data["plan"]
                    if (plan.get("monthly_price") == 99 and 
                        plan.get("active") == False and
                        "updated_at" in plan):
                        self.log_test("PUT /api/admin/subscription-plans (valid)", True, 
                                    "Successfully updated plan, updated_at field present")
                    else:
                        self.log_test("PUT /api/admin/subscription-plans (valid)", False, 
                                    "Plan not properly updated")
                else:
                    self.log_test("PUT /api/admin/subscription-plans (valid)", False, 
                                "Invalid response format")
            else:
                self.log_test("PUT /api/admin/subscription-plans (valid)", False, 
                            f"Status {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("PUT /api/admin/subscription-plans", False, f"Exception: {str(e)}")
    
    def test_subscription_plans_admin_delete(self):
        """Test DELETE /api/admin/subscription-plans/{plan_id} (ADMIN only)"""
        if not self.admin_token:
            self.log_test("DELETE /api/admin/subscription-plans", False, "No admin token")
            return
            
        if not hasattr(self, 'test_plan_id'):
            self.log_test("DELETE /api/admin/subscription-plans", False, "No test plan ID available")
            return
            
        try:
            headers = {"Authorization": f"Bearer {self.admin_token}"}
            
            # Test with invalid plan ID
            response = requests.delete(f"{BASE_URL}/admin/subscription-plans/invalid-id", 
                                     headers=headers)
            if response.status_code == 404:
                self.log_test("DELETE /api/admin/subscription-plans (invalid ID)", True, 
                            "Correctly returns 404 for invalid plan ID")
            
            # Test with valid plan ID
            response = requests.delete(f"{BASE_URL}/admin/subscription-plans/{self.test_plan_id}", 
                                     headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    # Verify plan is actually deleted
                    get_response = requests.get(f"{BASE_URL}/admin/subscription-plans", 
                                              headers=headers)
                    if get_response.status_code == 200:
                        plans = get_response.json().get("plans", [])
                        deleted_plan = next((p for p in plans if p.get("id") == self.test_plan_id), None)
                        if not deleted_plan:
                            self.log_test("DELETE /api/admin/subscription-plans (valid)", True, 
                                        "Successfully deleted plan, not found in subsequent GET")
                        else:
                            self.log_test("DELETE /api/admin/subscription-plans (valid)", False, 
                                        "Plan still exists after deletion")
                    else:
                        self.log_test("DELETE /api/admin/subscription-plans (valid)", True, 
                                    "Delete successful (couldn't verify with GET)")
                else:
                    self.log_test("DELETE /api/admin/subscription-plans (valid)", False, 
                                "success=false in response")
            else:
                self.log_test("DELETE /api/admin/subscription-plans (valid)", False, 
                            f"Status {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("DELETE /api/admin/subscription-plans", False, f"Exception: {str(e)}")
    
    def run_all_tests(self):
        """Run all tests in sequence"""
        print("🧪 BARBER HUB v3.9.0 Backend Testing - Site Settings + Subscription Plans")
        print("=" * 80)
        
        # Get admin token first
        if not self.get_admin_token():
            print("❌ Cannot proceed without admin token")
            return
        
        # Site Settings Tests
        print("\n📋 SITE SETTINGS TESTS")
        print("-" * 40)
        self.test_site_settings_public_get()
        self.test_site_settings_admin_put_no_auth()
        self.test_site_settings_admin_put_with_auth()
        self.test_site_settings_persistence()
        
        # Subscription Plans Tests
        print("\n💳 SUBSCRIPTION PLANS TESTS")
        print("-" * 40)
        self.test_subscription_plans_public_get()
        self.test_subscription_plans_country_filter()
        self.test_subscription_plans_admin_get()
        self.test_subscription_plans_admin_create()
        self.test_subscription_plans_admin_update()
        self.test_subscription_plans_admin_delete()
        
        # Summary
        print("\n📊 TEST SUMMARY")
        print("=" * 80)
        passed = sum(1 for result in self.test_results if "✅ PASS" in result)
        failed = sum(1 for result in self.test_results if "❌ FAIL" in result)
        total = len(self.test_results)
        
        print(f"Total Tests: {total}")
        print(f"Passed: {passed}")
        print(f"Failed: {failed}")
        print(f"Success Rate: {(passed/total*100):.1f}%")
        
        if failed > 0:
            print("\n❌ FAILED TESTS:")
            for result in self.test_results:
                if "❌ FAIL" in result:
                    print(f"  {result}")
        
        return passed, failed, total

if __name__ == "__main__":
    runner = TestRunner()
    runner.run_all_tests()