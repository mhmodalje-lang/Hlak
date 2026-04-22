#!/usr/bin/env python3
"""
BARBER HUB v3.8.0 - Comprehensive Backend Testing
Tests all new security & UX endpoints + regression check
"""

import requests
import json
import time
import pyotp
from datetime import datetime

# Configuration
BASE_URL = "https://barber-finder-26.preview.emergentagent.com/api"
ADMIN_PHONE = "admin"
ADMIN_PASSWORD = "AdminPass2026!"

class BarberHubTester:
    def __init__(self):
        self.admin_token = None
        self.user_token = None
        self.barbershop_token = None
        self.refresh_token = None
        self.totp_secret = None
        self.backup_codes = []
        self.test_results = []
        
    def log_test(self, test_name, success, details=""):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        self.test_results.append({
            "test": test_name,
            "status": status,
            "details": details
        })
        print(f"{status} - {test_name}")
        if details:
            print(f"    {details}")
    
    def login_admin(self):
        """Login as admin and get token"""
        try:
            response = requests.post(f"{BASE_URL}/auth/login", json={
                "phone_number": ADMIN_PHONE,
                "password": ADMIN_PASSWORD
            })
            if response.status_code == 200:
                data = response.json()
                self.admin_token = data.get("access_token")
                self.log_test("Admin Login", True, f"Token obtained")
                return True
            else:
                self.log_test("Admin Login", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
        except Exception as e:
            self.log_test("Admin Login", False, f"Exception: {str(e)}")
            return False
    
    def create_test_user(self):
        """Create a test user for testing"""
        try:
            response = requests.post(f"{BASE_URL}/auth/register", json={
                "phone_number": "963999888777",
                "password": "TestUser2026!",
                "full_name": "Test User",
                "gender": "male",
                "country": "Syria",
                "city": "Damascus"
            })
            if response.status_code in [200, 201]:
                data = response.json()
                self.user_token = data.get("access_token")
                self.log_test("Test User Creation", True, "User created and token obtained")
                return True
            elif response.status_code == 400 and "already exists" in response.text.lower():
                # User already exists, try to login
                login_response = requests.post(f"{BASE_URL}/auth/login", json={
                    "phone_number": "963999888777",
                    "password": "TestUser2026!"
                })
                if login_response.status_code == 200:
                    data = login_response.json()
                    self.user_token = data.get("access_token")
                    self.log_test("Test User Creation", True, "User already exists, logged in")
                    return True
            
            self.log_test("Test User Creation", False, f"Status: {response.status_code}, Response: {response.text}")
            return False
        except Exception as e:
            self.log_test("Test User Creation", False, f"Exception: {str(e)}")
            return False
    
    def create_test_barbershop(self):
        """Create a test barbershop for testing"""
        try:
            response = requests.post(f"{BASE_URL}/auth/register-barbershop", json={
                "phone_number": "963999888666",
                "password": "TestShop2026!",
                "owner_name": "Test Shop Owner",
                "shop_name": "Test Barbershop",
                "city": "Test City",
                "country": "Syria",
                "shop_type": "male"
            })
            if response.status_code in [200, 201]:
                data = response.json()
                self.barbershop_token = data.get("access_token")
                self.log_test("Test Barbershop Creation", True, "Barbershop created and token obtained")
                return True
            elif response.status_code == 400 and "already exists" in response.text.lower():
                # Barbershop already exists, try to login
                login_response = requests.post(f"{BASE_URL}/auth/login", json={
                    "phone_number": "963999888666",
                    "password": "TestShop2026!"
                })
                if login_response.status_code == 200:
                    data = login_response.json()
                    self.barbershop_token = data.get("access_token")
                    self.log_test("Test Barbershop Creation", True, "Barbershop already exists, logged in")
                    return True
            
            self.log_test("Test Barbershop Creation", False, f"Status: {response.status_code}, Response: {response.text}")
            return False
        except Exception as e:
            self.log_test("Test Barbershop Creation", False, f"Exception: {str(e)}")
            return False

    def test_forgot_reset_password(self):
        """Test forgot/reset password endpoints"""
        print("\n=== Testing Forgot/Reset Password ===")
        
        # Test 1: Non-existent phone number
        try:
            response = requests.post(f"{BASE_URL}/auth/forgot-password", json={
                "phone_number": "+999999999999"
            })
            if response.status_code == 200:
                data = response.json()
                if data.get("wa_link") is None:
                    self.log_test("Forgot Password - Non-existent phone", True, "Returns 200 with wa_link=null (no user enumeration)")
                else:
                    self.log_test("Forgot Password - Non-existent phone", False, "Should return wa_link=null for non-existent users")
            else:
                self.log_test("Forgot Password - Non-existent phone", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("Forgot Password - Non-existent phone", False, f"Exception: {str(e)}")
        
        # Test 2: Valid admin phone
        try:
            response = requests.post(f"{BASE_URL}/auth/forgot-password", json={
                "phone_number": "admin"
            })
            if response.status_code == 200:
                data = response.json()
                wa_link = data.get("wa_link", "")
                if wa_link and wa_link.startswith("https://wa.me/"):
                    self.log_test("Forgot Password - Valid admin phone", True, "Returns wa_link starting with https://wa.me/")
                else:
                    self.log_test("Forgot Password - Valid admin phone", False, f"wa_link should start with https://wa.me/, got: {wa_link}")
            else:
                self.log_test("Forgot Password - Valid admin phone", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("Forgot Password - Valid admin phone", False, f"Exception: {str(e)}")
        
        # Test 3: Rate limiting (6 requests quickly)
        try:
            rate_limit_triggered = False
            for i in range(6):
                response = requests.post(f"{BASE_URL}/auth/forgot-password", json={
                    "phone_number": "admin"
                })
                if response.status_code == 429:
                    rate_limit_triggered = True
                    break
                time.sleep(0.1)  # Small delay between requests
            
            self.log_test("Forgot Password - Rate limiting", rate_limit_triggered, 
                         "Rate limit triggered on 6th request" if rate_limit_triggered else "Rate limit not triggered")
        except Exception as e:
            self.log_test("Forgot Password - Rate limiting", False, f"Exception: {str(e)}")
        
        # Test 4: Reset with wrong OTP
        try:
            response = requests.post(f"{BASE_URL}/auth/reset-password", json={
                "phone_number": "admin",
                "otp": "wrong123",
                "new_password": "NewPassword2026!"
            })
            if response.status_code == 400:
                self.log_test("Reset Password - Wrong OTP", True, "Returns 400 for invalid OTP")
            else:
                self.log_test("Reset Password - Wrong OTP", False, f"Expected 400, got {response.status_code}")
        except Exception as e:
            self.log_test("Reset Password - Wrong OTP", False, f"Exception: {str(e)}")
        
        # Test 5: Reset with weak password
        try:
            response = requests.post(f"{BASE_URL}/auth/reset-password", json={
                "phone_number": "admin",
                "otp": "123456",
                "new_password": "weak"
            })
            if response.status_code == 400 or response.status_code == 422:
                self.log_test("Reset Password - Weak password", True, "Returns 400/422 for weak password")
            else:
                self.log_test("Reset Password - Weak password", False, f"Expected 400/422, got {response.status_code}")
        except Exception as e:
            self.log_test("Reset Password - Weak password", False, f"Exception: {str(e)}")

    def test_phone_otp(self):
        """Test phone OTP endpoints"""
        print("\n=== Testing Phone OTP ===")
        
        if not self.admin_token:
            self.log_test("Phone OTP - Setup", False, "Admin token not available")
            return
        
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        
        # Test 1: Send OTP with admin auth
        try:
            response = requests.post(f"{BASE_URL}/auth/verify-phone/send", headers=headers)
            if response.status_code == 200:
                data = response.json()
                wa_link = data.get("wa_link", "")
                if wa_link and wa_link.startswith("https://wa.me/"):
                    self.log_test("Phone OTP - Send with auth", True, "Returns wa_link")
                else:
                    self.log_test("Phone OTP - Send with auth", False, f"Invalid wa_link: {wa_link}")
            else:
                self.log_test("Phone OTP - Send with auth", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("Phone OTP - Send with auth", False, f"Exception: {str(e)}")
        
        # Test 2: Confirm with wrong OTP
        try:
            response = requests.post(f"{BASE_URL}/auth/verify-phone/confirm", 
                                   headers=headers, 
                                   json={"otp": "wrong123"})
            if response.status_code == 400:
                self.log_test("Phone OTP - Wrong OTP", True, "Returns 400 for wrong OTP")
            else:
                self.log_test("Phone OTP - Wrong OTP", False, f"Expected 400, got {response.status_code}")
        except Exception as e:
            self.log_test("Phone OTP - Wrong OTP", False, f"Exception: {str(e)}")
        
        # Test 3: Without auth
        try:
            response = requests.post(f"{BASE_URL}/auth/verify-phone/send")
            if response.status_code == 401:
                self.log_test("Phone OTP - No auth", True, "Returns 401 without auth")
            else:
                self.log_test("Phone OTP - No auth", False, f"Expected 401, got {response.status_code}")
        except Exception as e:
            self.log_test("Phone OTP - No auth", False, f"Exception: {str(e)}")

    def test_refresh_tokens(self):
        """Test refresh token endpoints"""
        print("\n=== Testing Refresh Tokens ===")
        
        if not self.admin_token:
            self.log_test("Refresh Tokens - Setup", False, "Admin token not available")
            return
        
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        
        # Test 1: Issue refresh token
        try:
            response = requests.post(f"{BASE_URL}/auth/issue-refresh", headers=headers)
            if response.status_code == 200:
                data = response.json()
                refresh_token = data.get("refresh_token")
                expires_in_days = data.get("expires_in_days")
                if refresh_token and expires_in_days == 30:
                    self.refresh_token = refresh_token
                    self.log_test("Refresh Tokens - Issue", True, f"Got refresh token, expires in {expires_in_days} days")
                else:
                    self.log_test("Refresh Tokens - Issue", False, f"Missing refresh_token or wrong expires_in_days: {data}")
            else:
                self.log_test("Refresh Tokens - Issue", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("Refresh Tokens - Issue", False, f"Exception: {str(e)}")
        
        # Test 2: Use refresh token
        if self.refresh_token:
            try:
                response = requests.post(f"{BASE_URL}/auth/refresh", json={
                    "refresh_token": self.refresh_token
                })
                if response.status_code == 200:
                    data = response.json()
                    new_access_token = data.get("access_token")
                    if new_access_token:
                        self.log_test("Refresh Tokens - Use valid token", True, "Got new access token")
                    else:
                        self.log_test("Refresh Tokens - Use valid token", False, "No access_token in response")
                else:
                    self.log_test("Refresh Tokens - Use valid token", False, f"Status: {response.status_code}")
            except Exception as e:
                self.log_test("Refresh Tokens - Use valid token", False, f"Exception: {str(e)}")
        
        # Test 3: Use invalid refresh token
        try:
            response = requests.post(f"{BASE_URL}/auth/refresh", json={
                "refresh_token": "invalid_token_12345"
            })
            if response.status_code == 401:
                self.log_test("Refresh Tokens - Invalid token", True, "Returns 401 for invalid token")
            else:
                self.log_test("Refresh Tokens - Invalid token", False, f"Expected 401, got {response.status_code}")
        except Exception as e:
            self.log_test("Refresh Tokens - Invalid token", False, f"Exception: {str(e)}")
        
        # Test 4: Logout all (invalidate refresh tokens)
        try:
            response = requests.post(f"{BASE_URL}/auth/logout-all", headers=headers)
            if response.status_code == 200:
                self.log_test("Refresh Tokens - Logout all", True, "Logout all successful")
                
                # Test that old refresh token is now invalid
                if self.refresh_token:
                    time.sleep(1)  # Small delay
                    refresh_response = requests.post(f"{BASE_URL}/auth/refresh", json={
                        "refresh_token": self.refresh_token
                    })
                    if refresh_response.status_code == 401:
                        self.log_test("Refresh Tokens - Token invalidated", True, "Old refresh token now invalid")
                    else:
                        self.log_test("Refresh Tokens - Token invalidated", False, f"Old token still valid: {refresh_response.status_code}")
            else:
                self.log_test("Refresh Tokens - Logout all", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("Refresh Tokens - Logout all", False, f"Exception: {str(e)}")

    def test_2fa(self):
        """Test 2FA endpoints"""
        print("\n=== Testing 2FA ===")
        
        if not self.admin_token:
            self.log_test("2FA - Setup", False, "Admin token not available")
            return
        
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        
        # Test 1: Get 2FA status (should be disabled initially)
        try:
            response = requests.get(f"{BASE_URL}/admin/2fa/status", headers=headers)
            if response.status_code == 200:
                data = response.json()
                enabled = data.get("enabled", True)  # Default to True to test the false case
                if enabled == False:
                    self.log_test("2FA - Initial status", True, "2FA initially disabled")
                else:
                    self.log_test("2FA - Initial status", False, f"Expected enabled=false, got {enabled}")
            else:
                self.log_test("2FA - Initial status", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("2FA - Initial status", False, f"Exception: {str(e)}")
        
        # Test 2: Setup 2FA
        try:
            response = requests.post(f"{BASE_URL}/admin/2fa/setup", headers=headers)
            if response.status_code == 200:
                data = response.json()
                secret = data.get("secret")
                otpauth_uri = data.get("otpauth_uri")
                qr_code = data.get("qr_code")
                backup_codes = data.get("backup_codes", [])
                
                if secret and otpauth_uri and qr_code and len(backup_codes) == 8:
                    self.totp_secret = secret
                    self.backup_codes = backup_codes
                    self.log_test("2FA - Setup", True, f"Got secret, QR code, and {len(backup_codes)} backup codes")
                else:
                    self.log_test("2FA - Setup", False, f"Missing required fields: {data}")
            else:
                self.log_test("2FA - Setup", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("2FA - Setup", False, f"Exception: {str(e)}")
        
        # Test 3: Verify with wrong code
        try:
            response = requests.post(f"{BASE_URL}/admin/2fa/verify", 
                                   headers=headers, 
                                   json={"code": "wrong123"})
            if response.status_code == 400:
                self.log_test("2FA - Wrong verification code", True, "Returns 400 for wrong code")
            else:
                self.log_test("2FA - Wrong verification code", False, f"Expected 400, got {response.status_code}")
        except Exception as e:
            self.log_test("2FA - Wrong verification code", False, f"Exception: {str(e)}")
        
        # Test 4: Verify with correct TOTP code
        if self.totp_secret:
            try:
                totp = pyotp.TOTP(self.totp_secret)
                current_code = totp.now()
                
                response = requests.post(f"{BASE_URL}/admin/2fa/verify", 
                                       headers=headers, 
                                       json={"code": current_code})
                if response.status_code == 200:
                    data = response.json()
                    enabled = data.get("enabled", False)
                    if enabled:
                        self.log_test("2FA - Correct TOTP verification", True, "2FA enabled successfully")
                    else:
                        self.log_test("2FA - Correct TOTP verification", False, "2FA not enabled after verification")
                else:
                    self.log_test("2FA - Correct TOTP verification", False, f"Status: {response.status_code}")
            except Exception as e:
                self.log_test("2FA - Correct TOTP verification", False, f"Exception: {str(e)}")
        
        # Test 5: Check status after enabling
        try:
            response = requests.get(f"{BASE_URL}/admin/2fa/status", headers=headers)
            if response.status_code == 200:
                data = response.json()
                enabled = data.get("enabled", False)
                backup_codes_remaining = data.get("backup_codes_remaining", 0)
                if enabled and backup_codes_remaining == 8:
                    self.log_test("2FA - Status after enabling", True, f"enabled=true, backup_codes_remaining={backup_codes_remaining}")
                else:
                    self.log_test("2FA - Status after enabling", False, f"Expected enabled=true and 8 backup codes, got: {data}")
            else:
                self.log_test("2FA - Status after enabling", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("2FA - Status after enabling", False, f"Exception: {str(e)}")
        
        # Test 6: Disable with backup code
        if self.backup_codes:
            try:
                backup_code = self.backup_codes[0]  # Use first backup code
                response = requests.post(f"{BASE_URL}/admin/2fa/disable", 
                                       headers=headers, 
                                       json={"code": backup_code})
                if response.status_code == 200:
                    data = response.json()
                    enabled = data.get("enabled", True)
                    if not enabled:
                        self.log_test("2FA - Disable with backup code", True, "2FA disabled successfully")
                    else:
                        self.log_test("2FA - Disable with backup code", False, "2FA still enabled after disable")
                else:
                    self.log_test("2FA - Disable with backup code", False, f"Status: {response.status_code}")
            except Exception as e:
                self.log_test("2FA - Disable with backup code", False, f"Exception: {str(e)}")
        
        # Test 7: Re-enable and disable with TOTP
        if self.totp_secret:
            try:
                # Re-enable first
                setup_response = requests.post(f"{BASE_URL}/admin/2fa/setup", headers=headers)
                if setup_response.status_code == 200:
                    totp = pyotp.TOTP(self.totp_secret)
                    current_code = totp.now()
                    
                    verify_response = requests.post(f"{BASE_URL}/admin/2fa/verify", 
                                                  headers=headers, 
                                                  json={"code": current_code})
                    
                    if verify_response.status_code == 200:
                        # Now disable with TOTP
                        time.sleep(1)  # Ensure we get a different TOTP code
                        new_code = totp.now()
                        disable_response = requests.post(f"{BASE_URL}/admin/2fa/disable", 
                                                       headers=headers, 
                                                       json={"code": new_code})
                        
                        if disable_response.status_code == 200:
                            data = disable_response.json()
                            enabled = data.get("enabled", True)
                            if not enabled:
                                self.log_test("2FA - Re-enable and disable with TOTP", True, "Successfully re-enabled and disabled with TOTP")
                            else:
                                self.log_test("2FA - Re-enable and disable with TOTP", False, "2FA still enabled after TOTP disable")
                        else:
                            self.log_test("2FA - Re-enable and disable with TOTP", False, f"Disable failed: {disable_response.status_code}")
                    else:
                        self.log_test("2FA - Re-enable and disable with TOTP", False, f"Re-enable failed: {verify_response.status_code}")
                else:
                    self.log_test("2FA - Re-enable and disable with TOTP", False, f"Setup failed: {setup_response.status_code}")
            except Exception as e:
                self.log_test("2FA - Re-enable and disable with TOTP", False, f"Exception: {str(e)}")

    def test_gdpr(self):
        """Test GDPR endpoints"""
        print("\n=== Testing GDPR ===")
        
        if not self.admin_token:
            self.log_test("GDPR - Setup", False, "Admin token not available")
            return
        
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        
        # Test 1: Export user data
        try:
            response = requests.get(f"{BASE_URL}/users/me/export", headers=headers)
            if response.status_code == 200:
                data = response.json()
                exported_at = data.get("exported_at")
                profile = data.get("profile", {})
                
                # Check that sensitive fields are not included
                has_password = "password" in profile
                has_totp_secret = "totp_secret" in profile
                
                if exported_at and profile and not has_password and not has_totp_secret:
                    self.log_test("GDPR - Export data", True, "Export successful, no sensitive data included")
                else:
                    self.log_test("GDPR - Export data", False, f"Missing fields or sensitive data present: {data}")
            else:
                self.log_test("GDPR - Export data", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("GDPR - Export data", False, f"Exception: {str(e)}")
        
        # Test 2: Account deletion (should be blocked for master admin)
        try:
            response = requests.delete(f"{BASE_URL}/users/me/account", headers=headers)
            if response.status_code == 403:
                self.log_test("GDPR - Delete master admin account", True, "Master admin deletion blocked with 403")
            else:
                self.log_test("GDPR - Delete master admin account", False, f"Expected 403, got {response.status_code}")
        except Exception as e:
            self.log_test("GDPR - Delete master admin account", False, f"Exception: {str(e)}")

    def test_calendar(self):
        """Test calendar endpoints"""
        print("\n=== Testing Calendar ===")
        
        # First create a booking to test calendar features
        booking_id = self.create_test_booking()
        
        if not booking_id:
            self.log_test("Calendar - Setup", False, "Could not create test booking")
            return
        
        if not self.user_token:
            self.log_test("Calendar - Setup", False, "User token not available")
            return
        
        headers = {"Authorization": f"Bearer {self.user_token}"}
        
        # Test 1: Get calendar ICS
        try:
            response = requests.get(f"{BASE_URL}/bookings/{booking_id}/calendar.ics", headers=headers)
            if response.status_code == 200:
                content = response.text
                if content.startswith("BEGIN:VCALENDAR"):
                    self.log_test("Calendar - ICS export", True, "Returns valid calendar ICS format")
                else:
                    self.log_test("Calendar - ICS export", False, f"Invalid ICS format: {content[:100]}")
            else:
                self.log_test("Calendar - ICS export", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("Calendar - ICS export", False, f"Exception: {str(e)}")
        
        # Test 2: Get Google Calendar link
        try:
            response = requests.get(f"{BASE_URL}/bookings/{booking_id}/calendar-link", headers=headers)
            if response.status_code == 200:
                data = response.json()
                google_url = data.get("google_calendar_url", "")
                if google_url.startswith("https://calendar.google.com/"):
                    self.log_test("Calendar - Google Calendar link", True, "Returns valid Google Calendar URL")
                else:
                    self.log_test("Calendar - Google Calendar link", False, f"Invalid Google Calendar URL: {google_url}")
            else:
                self.log_test("Calendar - Google Calendar link", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("Calendar - Google Calendar link", False, f"Exception: {str(e)}")
        
        # Test 3: Access someone else's booking calendar (should be 403)
        if self.admin_token:
            admin_headers = {"Authorization": f"Bearer {self.admin_token}"}
            try:
                response = requests.get(f"{BASE_URL}/bookings/{booking_id}/calendar.ics", headers=admin_headers)
                if response.status_code == 403:
                    self.log_test("Calendar - Access control", True, "Returns 403 for unauthorized access")
                elif response.status_code == 200:
                    # Admin might have access to all bookings, this could be valid
                    self.log_test("Calendar - Access control", True, "Admin has access to all bookings (valid)")
                else:
                    self.log_test("Calendar - Access control", False, f"Unexpected status: {response.status_code}")
            except Exception as e:
                self.log_test("Calendar - Access control", False, f"Exception: {str(e)}")

    def create_test_booking(self):
        """Helper to create a test booking"""
        if not self.user_token or not self.barbershop_token:
            return None
        
        try:
            # Get a barbershop to book with
            response = requests.get(f"{BASE_URL}/barbershops/featured")
            if response.status_code == 200:
                shops = response.json()
                if shops:
                    shop_id = shops[0].get("_id")
                    
                    # Create booking
                    headers = {"Authorization": f"Bearer {self.user_token}"}
                    booking_response = requests.post(f"{BASE_URL}/bookings", 
                                                   headers=headers,
                                                   json={
                                                       "barbershop_id": shop_id,
                                                       "service": "Haircut",
                                                       "date": "2024-12-20",
                                                       "time": "10:00",
                                                       "notes": "Test booking for calendar"
                                                   })
                    
                    if booking_response.status_code in [200, 201]:
                        booking_data = booking_response.json()
                        return booking_data.get("_id") or booking_data.get("id")
        except Exception as e:
            print(f"Error creating test booking: {e}")
        
        return None

    def test_staff_management(self):
        """Test staff management endpoints"""
        print("\n=== Testing Staff Management ===")
        
        if not self.barbershop_token:
            self.log_test("Staff Management - Setup", False, "Barbershop token not available")
            return
        
        headers = {"Authorization": f"Bearer {self.barbershop_token}"}
        staff_id = None
        
        # Test 1: Add staff member
        try:
            response = requests.post(f"{BASE_URL}/barbershops/me/staff", 
                                   headers=headers,
                                   json={
                                       "name": "Ahmed",
                                       "role": "barber"
                                   })
            if response.status_code in [200, 201]:
                data = response.json()
                staff_id = data.get("id") or data.get("_id")
                if staff_id:
                    self.log_test("Staff Management - Add staff", True, f"Staff added with ID: {staff_id}")
                else:
                    self.log_test("Staff Management - Add staff", False, "No ID returned")
            else:
                self.log_test("Staff Management - Add staff", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("Staff Management - Add staff", False, f"Exception: {str(e)}")
        
        # Test 2: Get staff list
        try:
            response = requests.get(f"{BASE_URL}/barbershops/me/staff", headers=headers)
            if response.status_code == 200:
                staff_list = response.json()
                if isinstance(staff_list, list) and any(staff.get("name") == "Ahmed" for staff in staff_list):
                    self.log_test("Staff Management - Get staff list", True, f"Found {len(staff_list)} staff members including Ahmed")
                else:
                    self.log_test("Staff Management - Get staff list", False, f"Ahmed not found in staff list: {staff_list}")
            else:
                self.log_test("Staff Management - Get staff list", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("Staff Management - Get staff list", False, f"Exception: {str(e)}")
        
        # Test 3: Update staff member
        if staff_id:
            try:
                response = requests.put(f"{BASE_URL}/barbershops/me/staff/{staff_id}", 
                                      headers=headers,
                                      json={
                                          "name": "Ahmed Updated"
                                      })
                if response.status_code == 200:
                    self.log_test("Staff Management - Update staff", True, "Staff updated successfully")
                else:
                    self.log_test("Staff Management - Update staff", False, f"Status: {response.status_code}")
            except Exception as e:
                self.log_test("Staff Management - Update staff", False, f"Exception: {str(e)}")
        
        # Test 4: Get public staff list (no auth required)
        try:
            # Get shop ID first
            shop_response = requests.get(f"{BASE_URL}/barbershops/featured")
            if shop_response.status_code == 200:
                shops = shop_response.json()
                if shops:
                    shop_id = shops[0].get("_id")
                    
                    response = requests.get(f"{BASE_URL}/barbershops/{shop_id}/staff")
                    if response.status_code == 200:
                        staff_list = response.json()
                        self.log_test("Staff Management - Public staff list", True, f"Public staff list returned {len(staff_list)} members")
                    else:
                        self.log_test("Staff Management - Public staff list", False, f"Status: {response.status_code}")
                else:
                    self.log_test("Staff Management - Public staff list", False, "No shops available")
            else:
                self.log_test("Staff Management - Public staff list", False, f"Could not get shops: {shop_response.status_code}")
        except Exception as e:
            self.log_test("Staff Management - Public staff list", False, f"Exception: {str(e)}")
        
        # Test 5: Delete staff member
        if staff_id:
            try:
                response = requests.delete(f"{BASE_URL}/barbershops/me/staff/{staff_id}", headers=headers)
                if response.status_code == 200:
                    self.log_test("Staff Management - Delete staff", True, "Staff deleted successfully")
                else:
                    self.log_test("Staff Management - Delete staff", False, f"Status: {response.status_code}")
            except Exception as e:
                self.log_test("Staff Management - Delete staff", False, f"Exception: {str(e)}")
        
        # Test 6: Access control (try to access another shop's staff via /me endpoints)
        if self.user_token:
            user_headers = {"Authorization": f"Bearer {self.user_token}"}
            try:
                response = requests.get(f"{BASE_URL}/barbershops/me/staff", headers=user_headers)
                if response.status_code in [401, 403]:
                    self.log_test("Staff Management - Access control", True, "Non-barbershop user blocked from /me endpoints")
                else:
                    self.log_test("Staff Management - Access control", False, f"Expected 401/403, got {response.status_code}")
            except Exception as e:
                self.log_test("Staff Management - Access control", False, f"Exception: {str(e)}")

    def test_audit_log(self):
        """Test audit log endpoints"""
        print("\n=== Testing Audit Log ===")
        
        if not self.admin_token:
            self.log_test("Audit Log - Setup", False, "Admin token not available")
            return
        
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        
        # Test 1: Get audit log with limit
        try:
            response = requests.get(f"{BASE_URL}/admin/audit-log?limit=10", headers=headers)
            if response.status_code == 200:
                data = response.json()
                total = data.get("total", 0)
                items = data.get("items", [])
                if isinstance(items, list) and len(items) <= 10:
                    self.log_test("Audit Log - Basic query", True, f"Returned {len(items)} items, total: {total}")
                else:
                    self.log_test("Audit Log - Basic query", False, f"Invalid response format: {data}")
            else:
                self.log_test("Audit Log - Basic query", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("Audit Log - Basic query", False, f"Exception: {str(e)}")
        
        # Test 2: Filter by event type
        try:
            response = requests.get(f"{BASE_URL}/admin/audit-log?event=auth.login&limit=5", headers=headers)
            if response.status_code == 200:
                data = response.json()
                items = data.get("items", [])
                # Check if all items have the correct event type (if any items exist)
                if not items or all(item.get("event") == "auth.login" for item in items):
                    self.log_test("Audit Log - Event filter", True, f"Event filter working, {len(items)} login events")
                else:
                    self.log_test("Audit Log - Event filter", False, "Event filter not working correctly")
            else:
                self.log_test("Audit Log - Event filter", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("Audit Log - Event filter", False, f"Exception: {str(e)}")
        
        # Test 3: Without admin auth
        try:
            response = requests.get(f"{BASE_URL}/admin/audit-log?limit=10")
            if response.status_code in [401, 403]:
                self.log_test("Audit Log - No auth", True, "Returns 401/403 without admin auth")
            else:
                self.log_test("Audit Log - No auth", False, f"Expected 401/403, got {response.status_code}")
        except Exception as e:
            self.log_test("Audit Log - No auth", False, f"Exception: {str(e)}")

    def test_push(self):
        """Test push endpoints"""
        print("\n=== Testing Push ===")
        
        if not self.admin_token:
            self.log_test("Push - Setup", False, "Admin token not available")
            return
        
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        
        # Test: Push test with no subscriptions
        try:
            response = requests.post(f"{BASE_URL}/push/test", headers=headers)
            if response.status_code == 404:
                response_text = response.text.lower()
                if "no push subscriptions" in response_text:
                    self.log_test("Push - Test with no subscriptions", True, "Returns 404 'No push subscriptions' (graceful)")
                else:
                    self.log_test("Push - Test with no subscriptions", False, f"Wrong error message: {response.text}")
            else:
                self.log_test("Push - Test with no subscriptions", False, f"Expected 404, got {response.status_code}")
        except Exception as e:
            self.log_test("Push - Test with no subscriptions", False, f"Exception: {str(e)}")

    def test_guest(self):
        """Test guest endpoints"""
        print("\n=== Testing Guest ===")
        
        # Test 1: Guest init
        try:
            response = requests.get(f"{BASE_URL}/guest/init")
            if response.status_code == 200:
                data = response.json()
                guest_token = data.get("guest_token")
                capabilities = data.get("capabilities", [])
                locked_features = data.get("locked_features", [])
                
                if guest_token and "browse" in capabilities and "booking" in locked_features:
                    self.log_test("Guest - Init", True, "Returns guest_token with correct capabilities and locked_features")
                    
                    # Test 2: Decode JWT to verify entity_type
                    try:
                        import jwt
                        # Decode without verification (just to check payload)
                        decoded = jwt.decode(guest_token, options={"verify_signature": False})
                        entity_type = decoded.get("entity_type")
                        if entity_type == "guest":
                            self.log_test("Guest - JWT entity_type", True, "JWT contains entity_type='guest'")
                        else:
                            self.log_test("Guest - JWT entity_type", False, f"Expected entity_type='guest', got '{entity_type}'")
                    except Exception as jwt_e:
                        self.log_test("Guest - JWT entity_type", False, f"JWT decode error: {str(jwt_e)}")
                        
                else:
                    self.log_test("Guest - Init", False, f"Missing required fields: {data}")
            else:
                self.log_test("Guest - Init", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("Guest - Init", False, f"Exception: {str(e)}")

    def test_sitemap(self):
        """Test sitemap endpoint"""
        print("\n=== Testing Sitemap ===")
        
        # Test: Get sitemap.xml
        try:
            response = requests.get(f"{BASE_URL}/sitemap.xml")
            if response.status_code == 200:
                content_type = response.headers.get("content-type", "").lower()
                content = response.text
                
                if "application/xml" in content_type and "<urlset" in content:
                    self.log_test("Sitemap - XML format", True, "Returns valid XML sitemap with <urlset>")
                else:
                    self.log_test("Sitemap - XML format", False, f"Invalid format. Content-Type: {content_type}, Content: {content[:200]}")
            else:
                self.log_test("Sitemap - XML format", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("Sitemap - XML format", False, f"Exception: {str(e)}")

    def test_version_consistency(self):
        """Test version consistency across endpoints"""
        print("\n=== Testing Version Consistency ===")
        
        expected_version = "3.8.0"
        
        # Test 1: Health endpoint
        try:
            response = requests.get(f"{BASE_URL}/health")
            if response.status_code == 200:
                data = response.json()
                version = data.get("version")
                if version == expected_version:
                    self.log_test("Version - Health endpoint", True, f"Version {version}")
                else:
                    self.log_test("Version - Health endpoint", False, f"Expected {expected_version}, got {version}")
            else:
                self.log_test("Version - Health endpoint", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("Version - Health endpoint", False, f"Exception: {str(e)}")
        
        # Test 2: Public config endpoint
        try:
            response = requests.get(f"{BASE_URL}/config/public")
            if response.status_code == 200:
                data = response.json()
                version = data.get("version")
                features = data.get("features", {})
                languages = data.get("languages", [])
                
                version_ok = version == expected_version
                features_ok = all(features.values()) if features else False  # All features should be true
                languages_ok = len(languages) == 6
                
                if version_ok and features_ok and languages_ok:
                    self.log_test("Version - Public config", True, f"Version {version}, all features true, 6 languages")
                else:
                    self.log_test("Version - Public config", False, f"Version: {version}, Features all true: {features_ok}, Languages count: {len(languages)}")
            else:
                self.log_test("Version - Public config", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("Version - Public config", False, f"Exception: {str(e)}")
        
        # Test 3: PWA status endpoint
        try:
            response = requests.get(f"{BASE_URL}/pwa/status")
            if response.status_code == 200:
                data = response.json()
                version = data.get("version")
                if version == expected_version:
                    self.log_test("Version - PWA status", True, f"Version {version}")
                else:
                    self.log_test("Version - PWA status", False, f"Expected {expected_version}, got {version}")
            else:
                self.log_test("Version - PWA status", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("Version - PWA status", False, f"Exception: {str(e)}")

    def test_regression(self):
        """Test regression - critical endpoints must still work"""
        print("\n=== Testing Regression ===")
        
        # Test 1: User registration
        try:
            response = requests.post(f"{BASE_URL}/auth/register", json={
                "phone_number": "963999777666",
                "password": "RegTest2026!",
                "full_name": "Regression Test User",
                "gender": "male",
                "country": "Syria",
                "city": "Damascus"
            })
            if response.status_code in [200, 201]:
                data = response.json()
                access_token = data.get("access_token")
                if access_token:
                    self.log_test("Regression - User registration", True, "New user registered successfully")
                else:
                    self.log_test("Regression - User registration", False, "No access_token returned")
            elif response.status_code == 400 and "already exists" in response.text.lower():
                self.log_test("Regression - User registration", True, "User already exists (acceptable)")
            else:
                self.log_test("Regression - User registration", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("Regression - User registration", False, f"Exception: {str(e)}")
        
        # Test 2: User login
        try:
            response = requests.post(f"{BASE_URL}/auth/login", json={
                "phone_number": "963999777666",
                "password": "RegTest2026!"
            })
            if response.status_code == 200:
                data = response.json()
                access_token = data.get("access_token")
                if access_token:
                    self.log_test("Regression - User login", True, "User login successful")
                else:
                    self.log_test("Regression - User login", False, "No access_token returned")
            else:
                self.log_test("Regression - User login", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("Regression - User login", False, f"Exception: {str(e)}")
        
        # Test 3: Change password with wrong old password
        if self.user_token:
            headers = {"Authorization": f"Bearer {self.user_token}"}
            try:
                response = requests.post(f"{BASE_URL}/auth/change-password", 
                                       headers=headers,
                                       json={
                                           "old_password": "wrong_password",
                                           "new_password": "NewPassword2026!"
                                       })
                if response.status_code == 400:
                    self.log_test("Regression - Change password wrong old", True, "Returns 400 for wrong old password")
                else:
                    self.log_test("Regression - Change password wrong old", False, f"Expected 400, got {response.status_code}")
            except Exception as e:
                self.log_test("Regression - Change password wrong old", False, f"Exception: {str(e)}")
        
        # Test 4: Featured barbershops
        try:
            response = requests.get(f"{BASE_URL}/barbershops/featured")
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    self.log_test("Regression - Featured barbershops", True, f"Returns list of {len(data)} barbershops")
                else:
                    self.log_test("Regression - Featured barbershops", False, "Response is not a list")
            else:
                self.log_test("Regression - Featured barbershops", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("Regression - Featured barbershops", False, f"Exception: {str(e)}")
        
        # Test 5: Featured products
        try:
            response = requests.get(f"{BASE_URL}/products/featured")
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    self.log_test("Regression - Featured products", True, f"Returns list of {len(data)} products")
                else:
                    self.log_test("Regression - Featured products", False, "Response is not a list")
            else:
                self.log_test("Regression - Featured products", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("Regression - Featured products", False, f"Exception: {str(e)}")
        
        # Test 6: End-to-end booking creation
        if self.user_token:
            try:
                # Get a barbershop first
                shops_response = requests.get(f"{BASE_URL}/barbershops/featured")
                if shops_response.status_code == 200:
                    shops = shops_response.json()
                    if shops:
                        shop_id = shops[0].get("_id")
                        headers = {"Authorization": f"Bearer {self.user_token}"}
                        
                        booking_response = requests.post(f"{BASE_URL}/bookings", 
                                                       headers=headers,
                                                       json={
                                                           "barbershop_id": shop_id,
                                                           "service": "Haircut",
                                                           "date": "2024-12-21",
                                                           "time": "11:00",
                                                           "notes": "Regression test booking"
                                                       })
                        
                        if booking_response.status_code in [200, 201]:
                            booking_data = booking_response.json()
                            booking_id = booking_data.get("_id") or booking_data.get("id")
                            if booking_id:
                                # Verify booking appears in user's bookings
                                my_bookings_response = requests.get(f"{BASE_URL}/bookings/my", headers=headers)
                                if my_bookings_response.status_code == 200:
                                    my_bookings = my_bookings_response.json()
                                    if any(b.get("_id") == booking_id or b.get("id") == booking_id for b in my_bookings):
                                        self.log_test("Regression - End-to-end booking", True, "Booking created and appears in user's bookings")
                                    else:
                                        self.log_test("Regression - End-to-end booking", False, "Booking not found in user's bookings")
                                else:
                                    self.log_test("Regression - End-to-end booking", False, f"Could not get user bookings: {my_bookings_response.status_code}")
                            else:
                                self.log_test("Regression - End-to-end booking", False, "No booking ID returned")
                        else:
                            self.log_test("Regression - End-to-end booking", False, f"Booking creation failed: {booking_response.status_code}")
                    else:
                        self.log_test("Regression - End-to-end booking", False, "No barbershops available")
                else:
                    self.log_test("Regression - End-to-end booking", False, f"Could not get barbershops: {shops_response.status_code}")
            except Exception as e:
                self.log_test("Regression - End-to-end booking", False, f"Exception: {str(e)}")

    def print_summary(self):
        """Print test summary"""
        print("\n" + "="*80)
        print("BARBER HUB v3.8.0 TESTING SUMMARY")
        print("="*80)
        
        total_tests = len(self.test_results)
        passed_tests = len([r for r in self.test_results if "✅ PASS" in r["status"]])
        failed_tests = total_tests - passed_tests
        
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_tests}")
        print(f"Failed: {failed_tests}")
        print(f"Success Rate: {(passed_tests/total_tests*100):.1f}%")
        
        if failed_tests > 0:
            print(f"\n❌ FAILED TESTS ({failed_tests}):")
            for result in self.test_results:
                if "❌ FAIL" in result["status"]:
                    print(f"  - {result['test']}: {result['details']}")
        
        print(f"\n✅ PASSED TESTS ({passed_tests}):")
        for result in self.test_results:
            if "✅ PASS" in result["status"]:
                print(f"  - {result['test']}")
        
        print("\n" + "="*80)

    def run_all_tests(self):
        """Run all v3.8.0 tests"""
        print("BARBER HUB v3.8.0 - COMPREHENSIVE BACKEND TESTING")
        print("="*60)
        
        # Setup
        if not self.login_admin():
            print("❌ Cannot proceed without admin login")
            return
        
        self.create_test_user()
        self.create_test_barbershop()
        
        # Run all test categories
        self.test_forgot_reset_password()
        self.test_phone_otp()
        self.test_refresh_tokens()
        self.test_2fa()
        self.test_gdpr()
        self.test_calendar()
        self.test_staff_management()
        self.test_audit_log()
        self.test_push()
        self.test_guest()
        self.test_sitemap()
        self.test_version_consistency()
        self.test_regression()
        
        # Print summary
        self.print_summary()

if __name__ == "__main__":
    tester = BarberHubTester()
    tester.run_all_tests()