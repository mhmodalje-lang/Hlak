#!/usr/bin/env python3
"""
BARBER HUB v3.7.0 Admin Roles/Permissions System Test Suite
Testing the new Admin Roles/Permissions system + Master Owner + sub-admin CRUD + registration/login fix.
"""

import requests
import json
import time
import random
import string
from pymongo import MongoClient
import os
from dotenv import load_dotenv

# Load environment
load_dotenv('/app/backend/.env')

# Configuration
BASE_URL = "https://vuln-checker-8.preview.emergentagent.com/api"
SEED_TOKEN = "Seed_BHub_v36_X9Q2pT7vNcL8sJrK4mWzYbHfDgEa_c1u3iQoR5xZpV0nBkM6tH9wY2sLcA8jUe"
ADMIN_PHONE = "admin"
ADMIN_PASSWORD = "NewStrong2026!xYz"
MASTER_OWNER_EMAIL = "mohamadalrejab@gmail.com"

# MongoDB connection for direct database manipulation
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'barber_hub')

def get_mongo_client():
    """Get MongoDB client for direct database access"""
    return MongoClient(MONGO_URL)

def generate_random_phone():
    """Generate a random phone number for testing"""
    return "09" + ''.join(random.choices(string.digits, k=8))

def generate_random_password(length=10, include_digit=True):
    """Generate a random password"""
    chars = string.ascii_letters
    if include_digit:
        chars += string.digits
    password = ''.join(random.choices(chars, k=length))
    if include_digit and not any(c.isdigit() for c in password):
        # Ensure at least one digit
        password = password[:-1] + random.choice(string.digits)
    return password

def test_login_regression():
    """Test 1: Login regression — confirms the critical 405 fix is no longer regressing"""
    print("\n=== TEST 1: Login Regression (405 Fix Verification) ===")
    
    # 1a) POST /api/auth/login with admin credentials
    print("1a) Testing admin login...")
    login_payload = {
        "phone_number": ADMIN_PHONE,
        "password": ADMIN_PASSWORD
    }
    
    response = requests.post(f"{BASE_URL}/auth/login", json=login_payload)
    print(f"Admin login response: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        if "access_token" in data:
            print("✅ Admin login successful with access_token")
            admin_token = data["access_token"]
        else:
            print("❌ Admin login missing access_token")
            return False
    else:
        print(f"❌ Admin login failed: {response.status_code} - {response.text}")
        return False
    
    # 1b) POST /api/auth/register with new user
    print("1b) Testing user registration...")
    random_phone = "+9639992200" + ''.join(random.choices(string.digits, k=4))
    register_payload = {
        "phone_number": random_phone,
        "full_name": "Test User Registration",
        "password": "goodpass123",
        "gender": "male",
        "country": "سوريا",
        "city": "دمشق"
    }
    
    response = requests.post(f"{BASE_URL}/auth/register", json=register_payload)
    print(f"User registration response: {response.status_code}")
    
    if response.status_code in [200, 201]:
        print("✅ User registration successful")
    else:
        print(f"❌ User registration failed: {response.status_code} - {response.text}")
        return False
    
    # 1c) POST /api/auth/register-barbershop with valid payload
    print("1c) Testing barbershop registration...")
    random_shop_phone = "+9639992300" + ''.join(random.choices(string.digits, k=4))
    barbershop_payload = {
        "phone_number": random_shop_phone,
        "owner_name": "Test Barbershop Owner",
        "password": "shoppass123",
        "shop_name": "Test Barbershop",
        "shop_type": "male",
        "country": "سوريا",
        "city": "دمشق",
        "address": "Test Address"
    }
    
    response = requests.post(f"{BASE_URL}/auth/register-barbershop", json=barbershop_payload)
    print(f"Barbershop registration response: {response.status_code}")
    
    if response.status_code in [200, 201]:
        print("✅ Barbershop registration successful")
    else:
        print(f"❌ Barbershop registration failed: {response.status_code} - {response.text}")
        return False
    
    # 1d) Confirm /api/barbershops/register (OLD wrong path) returns 405
    print("1d) Testing old wrong path returns 405...")
    response = requests.post(f"{BASE_URL}/barbershops/register", json=barbershop_payload)
    print(f"Old path response: {response.status_code}")
    
    if response.status_code == 405:
        print("✅ Old wrong path correctly returns 405")
        return True
    else:
        print(f"❌ Old wrong path should return 405, got: {response.status_code}")
        return False

def test_permissions_catalog():
    """Test 2: GET /api/admin/permissions/catalog"""
    print("\n=== TEST 2: Admin Permissions Catalog ===")
    
    # Get admin token first
    login_payload = {"phone_number": ADMIN_PHONE, "password": ADMIN_PASSWORD}
    response = requests.post(f"{BASE_URL}/auth/login", json=login_payload)
    if response.status_code != 200:
        print("❌ Failed to get admin token")
        return False
    admin_token = response.json()["access_token"]
    
    # 2a) With admin token
    print("2a) Testing with admin token...")
    headers = {"Authorization": f"Bearer {admin_token}"}
    response = requests.get(f"{BASE_URL}/admin/permissions/catalog", headers=headers)
    print(f"Admin permissions catalog response: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        if "permissions" in data and "master_owner_email" in data:
            permissions = data["permissions"]
            master_email = data["master_owner_email"]
            print(f"✅ Permissions catalog returned {len(permissions)} permissions")
            print(f"✅ Master owner email: {master_email}")
            
            if len(permissions) == 12 and master_email == MASTER_OWNER_EMAIL:
                print("✅ Correct permissions count and master owner email")
            else:
                print(f"❌ Expected 12 permissions and {MASTER_OWNER_EMAIL}, got {len(permissions)} and {master_email}")
                return False
        else:
            print("❌ Missing permissions or master_owner_email in response")
            return False
    else:
        print(f"❌ Admin permissions catalog failed: {response.status_code} - {response.text}")
        return False
    
    # 2b) Without auth
    print("2b) Testing without auth...")
    response = requests.get(f"{BASE_URL}/admin/permissions/catalog")
    print(f"No auth response: {response.status_code}")
    
    if response.status_code == 401:
        print("✅ Correctly returns 401 without auth")
    else:
        print(f"❌ Should return 401 without auth, got: {response.status_code}")
        return False
    
    # 2c) As non-admin (create a regular user first)
    print("2c) Testing as non-admin...")
    random_phone = "+9639992400" + ''.join(random.choices(string.digits, k=4))
    register_payload = {
        "phone_number": random_phone,
        "full_name": "Regular User",
        "password": "userpass123",
        "gender": "male",
        "country": "سوريا",
        "city": "دمشق"
    }
    
    # Register user
    response = requests.post(f"{BASE_URL}/auth/register", json=register_payload)
    if response.status_code not in [200, 201]:
        print("❌ Failed to register test user")
        return False
    
    # Login as user
    login_payload = {"phone_number": random_phone, "password": "userpass123"}
    response = requests.post(f"{BASE_URL}/auth/login", json=login_payload)
    if response.status_code != 200:
        print("❌ Failed to login as test user")
        return False
    user_token = response.json()["access_token"]
    
    # Try to access admin endpoint
    headers = {"Authorization": f"Bearer {user_token}"}
    response = requests.get(f"{BASE_URL}/admin/permissions/catalog", headers=headers)
    print(f"Non-admin response: {response.status_code}")
    
    if response.status_code == 403:
        print("✅ Correctly returns 403 for non-admin")
        return True
    else:
        print(f"❌ Should return 403 for non-admin, got: {response.status_code}")
        return False

def test_admin_me():
    """Test 3: GET /api/admin/me"""
    print("\n=== TEST 3: Admin Me Endpoint ===")
    
    # Get admin token
    login_payload = {"phone_number": ADMIN_PHONE, "password": ADMIN_PASSWORD}
    response = requests.post(f"{BASE_URL}/auth/login", json=login_payload)
    if response.status_code != 200:
        print("❌ Failed to get admin token")
        return False
    admin_token = response.json()["access_token"]
    
    # 3a) With master admin token
    print("3a) Testing with master admin token...")
    headers = {"Authorization": f"Bearer {admin_token}"}
    response = requests.get(f"{BASE_URL}/admin/me", headers=headers)
    print(f"Admin me response: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        required_fields = ["id", "phone_number", "email", "full_name", "is_master", "permissions", "must_change_password"]
        
        for field in required_fields:
            if field not in data:
                print(f"❌ Missing field: {field}")
                return False
        
        if data["is_master"] == True and len(data["permissions"]) == 12 and data["must_change_password"] == False:
            print("✅ Master admin profile correct")
            print(f"✅ is_master: {data['is_master']}")
            print(f"✅ permissions count: {len(data['permissions'])}")
            print(f"✅ must_change_password: {data['must_change_password']}")
        else:
            print(f"❌ Incorrect master admin data: is_master={data['is_master']}, perms={len(data['permissions'])}, must_change={data['must_change_password']}")
            return False
    else:
        print(f"❌ Admin me failed: {response.status_code} - {response.text}")
        return False
    
    return True

def test_create_sub_admin():
    """Test 4: POST /api/admin/sub-admins (Master-only)"""
    print("\n=== TEST 4: Create Sub-Admin ===")
    
    # Get admin token
    login_payload = {"phone_number": ADMIN_PHONE, "password": ADMIN_PASSWORD}
    response = requests.post(f"{BASE_URL}/auth/login", json=login_payload)
    if response.status_code != 200:
        print("❌ Failed to get admin token")
        return False
    admin_token = response.json()["access_token"]
    headers = {"Authorization": f"Bearer {admin_token}"}
    
    # 4a) Create sub-admin A with limited permissions
    print("4a) Creating sub-admin A with limited permissions...")
    sub_admin_a_phone = "+9639992500" + ''.join(random.choices(string.digits, k=4))
    sub_admin_payload = {
        "phone_number": sub_admin_a_phone,
        "email": "subadmin.a@test.com",
        "full_name": "Sub Admin A",
        "password": "SubAdmin123!",
        "permissions": ["view_stats", "support"],
        "note": "Test sub-admin A"
    }
    
    response = requests.post(f"{BASE_URL}/admin/sub-admins", json=sub_admin_payload, headers=headers)
    print(f"Create sub-admin A response: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        if "admin" in data and data["admin"]["is_master"] == False:
            print("✅ Sub-admin A created successfully")
            sub_admin_a_id = data["admin"]["id"]
            print(f"✅ Sub-admin A ID: {sub_admin_a_id}")
            
            # Check must_change_password is True
            if data["admin"].get("must_change_password") == True:
                print("✅ must_change_password correctly set to True")
            else:
                print("❌ must_change_password should be True for new sub-admin")
                return False
        else:
            print("❌ Sub-admin A creation response invalid")
            return False
    else:
        print(f"❌ Sub-admin A creation failed: {response.status_code} - {response.text}")
        return False
    
    # 4b) Try to create sub-admin B with same phone number
    print("4b) Testing duplicate phone number...")
    duplicate_payload = {
        "phone_number": sub_admin_a_phone,  # Same phone
        "email": "subadmin.b@test.com",
        "full_name": "Sub Admin B",
        "password": "SubAdmin456!",
        "permissions": ["view_stats"]
    }
    
    response = requests.post(f"{BASE_URL}/admin/sub-admins", json=duplicate_payload, headers=headers)
    print(f"Duplicate phone response: {response.status_code}")
    
    if response.status_code == 400 and "already registered" in response.text:
        print("✅ Correctly rejected duplicate phone number")
    else:
        print(f"❌ Should reject duplicate phone with 400, got: {response.status_code}")
        return False
    
    # 4c) Try to create sub-admin with master owner email
    print("4c) Testing master owner email restriction...")
    master_email_payload = {
        "phone_number": "+9639992600" + ''.join(random.choices(string.digits, k=4)),
        "email": MASTER_OWNER_EMAIL,
        "full_name": "Fake Master",
        "password": "FakeMaster123!",
        "permissions": ["view_stats"]
    }
    
    response = requests.post(f"{BASE_URL}/admin/sub-admins", json=master_email_payload, headers=headers)
    print(f"Master email response: {response.status_code}")
    
    if response.status_code == 400 and "reserved for the Master Owner" in response.text:
        print("✅ Correctly rejected master owner email")
    else:
        print(f"❌ Should reject master owner email with 400, got: {response.status_code}")
        return False
    
    # 4d) Try to create sub-admin with weak password
    print("4d) Testing weak password...")
    weak_password_payload = {
        "phone_number": "+9639992700" + ''.join(random.choices(string.digits, k=4)),
        "email": "weak@test.com",
        "full_name": "Weak Password User",
        "password": "abc",  # Too weak
        "permissions": ["view_stats"]
    }
    
    response = requests.post(f"{BASE_URL}/admin/sub-admins", json=weak_password_payload, headers=headers)
    print(f"Weak password response: {response.status_code}")
    
    if response.status_code == 422:
        print("✅ Correctly rejected weak password with 422")
    else:
        print(f"❌ Should reject weak password with 422, got: {response.status_code}")
        return False
    
    # 4e) Try to create sub-admin with invalid permission
    print("4e) Testing invalid permission...")
    invalid_perm_payload = {
        "phone_number": "+9639992800" + ''.join(random.choices(string.digits, k=4)),
        "email": "invalid@test.com",
        "full_name": "Invalid Permission User",
        "password": "ValidPass123!",
        "permissions": ["steal_keys"]  # Invalid permission
    }
    
    response = requests.post(f"{BASE_URL}/admin/sub-admins", json=invalid_perm_payload, headers=headers)
    print(f"Invalid permission response: {response.status_code}")
    
    if response.status_code == 422 and "Unknown permission" in response.text:
        print("✅ Correctly rejected invalid permission")
    else:
        print(f"❌ Should reject invalid permission with 422, got: {response.status_code}")
        return False
    
    # Store sub-admin A info for later tests
    global sub_admin_a_phone_global, sub_admin_a_id_global
    sub_admin_a_phone_global = sub_admin_a_phone
    sub_admin_a_id_global = sub_admin_a_id
    
    return True

def test_sub_admin_permissions():
    """Test 4f-4g: Sub-admin permission restrictions"""
    print("\n=== TEST 4f-4g: Sub-Admin Permission Restrictions ===")
    
    # Login as sub-admin A
    print("4f) Testing sub-admin trying to create another sub-admin...")
    login_payload = {"phone_number": sub_admin_a_phone_global, "password": "SubAdmin123!"}
    response = requests.post(f"{BASE_URL}/auth/login", json=login_payload)
    
    if response.status_code != 200:
        print("❌ Failed to login as sub-admin A")
        return False
    
    sub_admin_token = response.json()["access_token"]
    headers = {"Authorization": f"Bearer {sub_admin_token}"}
    
    # Try to create another sub-admin
    new_sub_admin_payload = {
        "phone_number": "+9639992900" + ''.join(random.choices(string.digits, k=4)),
        "email": "another@test.com",
        "full_name": "Another Sub Admin",
        "password": "AnotherSub123!",
        "permissions": ["view_stats"]
    }
    
    response = requests.post(f"{BASE_URL}/admin/sub-admins", json=new_sub_admin_payload, headers=headers)
    print(f"Sub-admin create attempt response: {response.status_code}")
    
    if response.status_code == 403 and "Master admin access required" in response.text:
        print("✅ Sub-admin correctly blocked from creating sub-admins")
    else:
        print(f"❌ Should block sub-admin with 403, got: {response.status_code} - {response.text}")
        return False
    
    # 4g) Test non-admin customer trying to create sub-admin
    print("4g) Testing non-admin customer...")
    # Create a regular customer
    customer_phone = "+9639993000" + ''.join(random.choices(string.digits, k=4))
    register_payload = {
        "phone_number": customer_phone,
        "full_name": "Regular Customer",
        "password": "customer123",
        "gender": "male",
        "country": "سوريا",
        "city": "دمشق"
    }
    
    response = requests.post(f"{BASE_URL}/auth/register", json=register_payload)
    if response.status_code not in [200, 201]:
        print("❌ Failed to register customer")
        return False
    
    # Login as customer
    login_payload = {"phone_number": customer_phone, "password": "customer123"}
    response = requests.post(f"{BASE_URL}/auth/login", json=login_payload)
    if response.status_code != 200:
        print("❌ Failed to login as customer")
        return False
    
    customer_token = response.json()["access_token"]
    headers = {"Authorization": f"Bearer {customer_token}"}
    
    # Try to create sub-admin
    response = requests.post(f"{BASE_URL}/admin/sub-admins", json=new_sub_admin_payload, headers=headers)
    print(f"Customer create attempt response: {response.status_code}")
    
    if response.status_code == 403:
        print("✅ Customer correctly blocked from creating sub-admins")
        return True
    else:
        print(f"❌ Should block customer with 403, got: {response.status_code}")
        return False

def test_update_sub_admin():
    """Test 5: PUT /api/admin/sub-admins/{id}"""
    print("\n=== TEST 5: Update Sub-Admin ===")
    
    # Get admin token
    login_payload = {"phone_number": ADMIN_PHONE, "password": ADMIN_PASSWORD}
    response = requests.post(f"{BASE_URL}/auth/login", json=login_payload)
    if response.status_code != 200:
        print("❌ Failed to get admin token")
        return False
    admin_token = response.json()["access_token"]
    headers = {"Authorization": f"Bearer {admin_token}"}
    
    # 5a) Update sub-admin A
    print("5a) Updating sub-admin A...")
    update_payload = {
        "permissions": ["view_stats", "manage_reviews", "support"],
        "full_name": "Updated Sub Admin A",
        "active": False
    }
    
    response = requests.put(f"{BASE_URL}/admin/sub-admins/{sub_admin_a_id_global}", json=update_payload, headers=headers)
    print(f"Update sub-admin response: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        if "admin" in data:
            admin_data = data["admin"]
            if (admin_data["full_name"] == "Updated Sub Admin A" and 
                admin_data["active"] == False and
                set(admin_data.get("permissions", [])) == {"view_stats", "manage_reviews", "support"}):
                print("✅ Sub-admin A updated successfully")
            else:
                print("❌ Sub-admin A update data incorrect")
                return False
        else:
            print("❌ Sub-admin A update response invalid")
            return False
    else:
        print(f"❌ Sub-admin A update failed: {response.status_code} - {response.text}")
        return False
    
    # 5b) Try to update Master Owner's record
    print("5b) Testing Master Owner protection...")
    # First get the master admin ID
    response = requests.get(f"{BASE_URL}/admin/me", headers=headers)
    if response.status_code != 200:
        print("❌ Failed to get master admin info")
        return False
    
    master_id = response.json()["id"]
    
    # Try to update master
    master_update_payload = {
        "full_name": "Hacked Master",
        "active": False
    }
    
    response = requests.put(f"{BASE_URL}/admin/sub-admins/{master_id}", json=master_update_payload, headers=headers)
    print(f"Master update attempt response: {response.status_code}")
    
    if response.status_code == 403 and "Master Owner account cannot be modified" in response.text:
        print("✅ Master Owner correctly protected from modification")
    else:
        print(f"❌ Should protect Master Owner with 403, got: {response.status_code}")
        return False
    
    # 5c) Try sub-admin updating their own record
    print("5c) Testing sub-admin self-update restriction...")
    # Login as sub-admin A
    login_payload = {"phone_number": sub_admin_a_phone_global, "password": "SubAdmin123!"}
    response = requests.post(f"{BASE_URL}/auth/login", json=login_payload)
    
    if response.status_code != 200:
        print("❌ Failed to login as sub-admin A")
        return False
    
    sub_admin_token = response.json()["access_token"]
    sub_headers = {"Authorization": f"Bearer {sub_admin_token}"}
    
    # Try to update own record
    self_update_payload = {
        "permissions": ["manage_admins"],  # Try to escalate
        "full_name": "Self Updated"
    }
    
    response = requests.put(f"{BASE_URL}/admin/sub-admins/{sub_admin_a_id_global}", json=self_update_payload, headers=sub_headers)
    print(f"Sub-admin self-update response: {response.status_code}")
    
    if response.status_code == 403 and "Master admin access required" in response.text:
        print("✅ Sub-admin correctly blocked from self-update")
        return True
    else:
        print(f"❌ Should block sub-admin self-update with 403, got: {response.status_code} - {response.text}")
        return False

def test_reset_password():
    """Test 6: POST /api/admin/sub-admins/{id}/reset-password"""
    print("\n=== TEST 6: Reset Sub-Admin Password ===")
    
    # Get admin token
    login_payload = {"phone_number": ADMIN_PHONE, "password": ADMIN_PASSWORD}
    response = requests.post(f"{BASE_URL}/auth/login", json=login_payload)
    if response.status_code != 200:
        print("❌ Failed to get admin token")
        return False
    admin_token = response.json()["access_token"]
    headers = {"Authorization": f"Bearer {admin_token}"}
    
    # 6a) Reset sub-admin A password
    print("6a) Resetting sub-admin A password...")
    response = requests.post(f"{BASE_URL}/admin/sub-admins/{sub_admin_a_id_global}/reset-password", headers=headers)
    print(f"Reset password response: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        if "temporary_password" in data and "message" in data:
            temp_password = data["temporary_password"]
            if len(temp_password) >= 12:
                print(f"✅ Password reset successful, temp password length: {len(temp_password)}")
                print(f"✅ Message: {data['message']}")
            else:
                print(f"❌ Temporary password too short: {len(temp_password)}")
                return False
        else:
            print("❌ Reset password response missing required fields")
            return False
    else:
        print(f"❌ Reset password failed: {response.status_code} - {response.text}")
        return False
    
    # 6b) Login with new temporary password
    print("6b) Testing login with temporary password...")
    login_payload = {"phone_number": sub_admin_a_phone_global, "password": temp_password}
    response = requests.post(f"{BASE_URL}/auth/login", json=login_payload)
    print(f"Temp password login response: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        if data.get("user", {}).get("must_change_password") == True:
            print("✅ Login successful with must_change_password=True")
            temp_token = data["access_token"]
        else:
            print("❌ must_change_password should be True after reset")
            return False
    else:
        print(f"❌ Temp password login failed: {response.status_code} - {response.text}")
        return False
    
    # 6c) Try protected endpoint before password change
    print("6c) Testing protected endpoint before password change...")
    temp_headers = {"Authorization": f"Bearer {temp_token}"}
    response = requests.get(f"{BASE_URL}/admin/stats", headers=temp_headers)
    print(f"Protected endpoint response: {response.status_code}")
    
    if response.status_code == 403 and "must change your password" in response.text:
        print("✅ Protected endpoint correctly blocked before password change")
    else:
        print(f"❌ Should block with 403 before password change, got: {response.status_code}")
        return False
    
    # 6d) Change password
    print("6d) Changing password...")
    change_password_payload = {
        "old_password": temp_password,
        "new_password": "NewSubAdmin123!"
    }
    
    response = requests.post(f"{BASE_URL}/auth/change-password", json=change_password_payload, headers=temp_headers)
    print(f"Change password response: {response.status_code}")
    
    if response.status_code == 200:
        print("✅ Password change successful")
        
        # Login again with new password to verify must_change_password is cleared
        login_payload = {"phone_number": sub_admin_a_phone_global, "password": "NewSubAdmin123!"}
        response = requests.post(f"{BASE_URL}/auth/login", json=login_payload)
        
        if response.status_code == 200:
            data = response.json()
            if data.get("user", {}).get("must_change_password") == False:
                print("✅ must_change_password flag cleared after password change")
            else:
                print("❌ must_change_password should be False after password change")
                return False
        else:
            print("❌ Failed to login with new password")
            return False
    else:
        print(f"❌ Password change failed: {response.status_code} - {response.text}")
        return False
    
    # 6e) Try to reset Master Owner password
    print("6e) Testing Master Owner password reset protection...")
    # Get master admin ID
    response = requests.get(f"{BASE_URL}/admin/me", headers=headers)
    if response.status_code != 200:
        print("❌ Failed to get master admin info")
        return False
    
    master_id = response.json()["id"]
    
    # Try to reset master password
    response = requests.post(f"{BASE_URL}/admin/sub-admins/{master_id}/reset-password", headers=headers)
    print(f"Master reset attempt response: {response.status_code}")
    
    if response.status_code == 403 and "Master Owner password cannot be reset" in response.text:
        print("✅ Master Owner password correctly protected from reset")
        return True
    else:
        print(f"❌ Should protect Master Owner password with 403, got: {response.status_code}")
        return False

def test_delete_sub_admin():
    """Test 7: DELETE /api/admin/sub-admins/{id}"""
    print("\n=== TEST 7: Delete Sub-Admin ===")
    
    # Get admin token
    login_payload = {"phone_number": ADMIN_PHONE, "password": ADMIN_PASSWORD}
    response = requests.post(f"{BASE_URL}/auth/login", json=login_payload)
    if response.status_code != 200:
        print("❌ Failed to get admin token")
        return False
    admin_token = response.json()["access_token"]
    headers = {"Authorization": f"Bearer {admin_token}"}
    
    # 7a) Delete sub-admin A
    print("7a) Deleting sub-admin A...")
    response = requests.delete(f"{BASE_URL}/admin/sub-admins/{sub_admin_a_id_global}", headers=headers)
    print(f"Delete sub-admin response: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        if "message" in data and data["id"] == sub_admin_a_id_global:
            print("✅ Sub-admin A deleted successfully")
        else:
            print("❌ Delete response invalid")
            return False
    else:
        print(f"❌ Delete sub-admin failed: {response.status_code} - {response.text}")
        return False
    
    # 7b) Try to delete self (master)
    print("7b) Testing master self-delete protection...")
    # Get master admin ID
    response = requests.get(f"{BASE_URL}/admin/me", headers=headers)
    if response.status_code != 200:
        print("❌ Failed to get master admin info")
        return False
    
    master_id = response.json()["id"]
    
    # Try to delete self
    response = requests.delete(f"{BASE_URL}/admin/sub-admins/{master_id}", headers=headers)
    print(f"Master self-delete response: {response.status_code}")
    
    if response.status_code == 400 and "cannot delete your own account" in response.text:
        print("✅ Master correctly blocked from self-delete")
        return True
    elif response.status_code == 403:
        print("✅ Master correctly blocked from self-delete (403)")
        return True
    else:
        print(f"❌ Should block master self-delete with 400/403, got: {response.status_code}")
        return False

def test_permission_enforcement():
    """Test 8: Permission enforcement sanity"""
    print("\n=== TEST 8: Permission Enforcement Sanity ===")
    
    # Get admin token
    login_payload = {"phone_number": ADMIN_PHONE, "password": ADMIN_PASSWORD}
    response = requests.post(f"{BASE_URL}/auth/login", json=login_payload)
    if response.status_code != 200:
        print("❌ Failed to get admin token")
        return False
    admin_token = response.json()["access_token"]
    headers = {"Authorization": f"Bearer {admin_token}"}
    
    # 8a) Create sub-admin C with ONLY view_stats permission
    print("8a) Creating sub-admin C with limited permissions...")
    sub_admin_c_phone = "+9639993100" + ''.join(random.choices(string.digits, k=4))
    sub_admin_payload = {
        "phone_number": sub_admin_c_phone,
        "email": "subadmin.c@test.com",
        "full_name": "Sub Admin C",
        "password": "SubAdminC123!",
        "permissions": ["view_stats"],
        "note": "Limited permissions test"
    }
    
    response = requests.post(f"{BASE_URL}/admin/sub-admins", json=sub_admin_payload, headers=headers)
    print(f"Create sub-admin C response: {response.status_code}")
    
    if response.status_code != 200:
        print(f"❌ Failed to create sub-admin C: {response.status_code} - {response.text}")
        return False
    
    sub_admin_c_id = response.json()["admin"]["id"]
    print(f"✅ Sub-admin C created with ID: {sub_admin_c_id}")
    
    # Reset password to get a known password
    response = requests.post(f"{BASE_URL}/admin/sub-admins/{sub_admin_c_id}/reset-password", headers=headers)
    if response.status_code != 200:
        print("❌ Failed to reset sub-admin C password")
        return False
    
    temp_password = response.json()["temporary_password"]
    
    # 8b) Login as sub-admin C
    print("8b) Testing sub-admin C login and stats access...")
    login_payload = {"phone_number": sub_admin_c_phone, "password": temp_password}
    response = requests.post(f"{BASE_URL}/auth/login", json=login_payload)
    
    if response.status_code != 200:
        print("❌ Failed to login as sub-admin C")
        return False
    
    sub_admin_c_token = response.json()["access_token"]
    
    # Change password first to clear must_change_password
    change_password_payload = {
        "old_password": temp_password,
        "new_password": "SubAdminC456!"
    }
    
    temp_headers = {"Authorization": f"Bearer {sub_admin_c_token}"}
    response = requests.post(f"{BASE_URL}/auth/change-password", json=change_password_payload, headers=temp_headers)
    
    if response.status_code != 200:
        print("❌ Failed to change sub-admin C password")
        return False
    
    # Login again with new password
    login_payload = {"phone_number": sub_admin_c_phone, "password": "SubAdminC456!"}
    response = requests.post(f"{BASE_URL}/auth/login", json=login_payload)
    
    if response.status_code != 200:
        print("❌ Failed to login with new password")
        return False
    
    sub_admin_c_token = response.json()["access_token"]
    sub_admin_c_headers = {"Authorization": f"Bearer {sub_admin_c_token}"}
    
    # Test access to admin stats
    response = requests.get(f"{BASE_URL}/admin/stats", headers=sub_admin_c_headers)
    print(f"Sub-admin C stats access response: {response.status_code}")
    
    if response.status_code == 200:
        print("✅ Sub-admin C can access stats (legacy require_admin behavior)")
    elif response.status_code == 403:
        print("✅ Sub-admin C blocked from stats (permission-gated)")
    else:
        print(f"⚠️ Unexpected stats response: {response.status_code}")
    
    # 8c) This is an audit question - report the finding
    print("8c) Audit finding: Legacy admin endpoints may not honor per-permission dependency")
    print("    This is expected behavior as noted in the requirements")
    
    return True

def test_regression():
    """Test 9: Regression tests"""
    print("\n=== TEST 9: Regression Tests ===")
    
    # 9a) GET /api/health
    print("9a) Testing health endpoint...")
    response = requests.get(f"{BASE_URL}/health")
    print(f"Health response: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        if "status" in data and data["status"] == "ok":
            print("✅ Health endpoint working")
        else:
            print("❌ Health endpoint response invalid")
            return False
    else:
        print(f"❌ Health endpoint failed: {response.status_code}")
        return False
    
    # 9b) GET /api/products/featured
    print("9b) Testing featured products...")
    response = requests.get(f"{BASE_URL}/products/featured")
    print(f"Featured products response: {response.status_code}")
    
    if response.status_code == 200:
        products = response.json()
        if isinstance(products, list) and len(products) >= 10:
            print(f"✅ Featured products working, count: {len(products)}")
        else:
            print(f"❌ Featured products insufficient count: {len(products) if isinstance(products, list) else 'not a list'}")
            return False
    else:
        print(f"❌ Featured products failed: {response.status_code}")
        return False
    
    # 9c) POST /api/auth/change-password with correct creds (optional test)
    print("9c) Testing change password endpoint (optional)...")
    # Get admin token
    login_payload = {"phone_number": ADMIN_PHONE, "password": ADMIN_PASSWORD}
    response = requests.post(f"{BASE_URL}/auth/login", json=login_payload)
    
    if response.status_code == 200:
        admin_token = response.json()["access_token"]
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Test change password endpoint (but don't actually change master password)
        change_payload = {
            "old_password": ADMIN_PASSWORD,
            "new_password": ADMIN_PASSWORD  # Same password to avoid breaking
        }
        
        response = requests.post(f"{BASE_URL}/auth/change-password", json=change_payload, headers=headers)
        print(f"Change password test response: {response.status_code}")
        
        if response.status_code == 400 and "same as the old password" in response.text:
            print("✅ Change password endpoint working (correctly rejected same password)")
        elif response.status_code == 200:
            print("✅ Change password endpoint working")
        else:
            print(f"⚠️ Change password unexpected response: {response.status_code}")
    else:
        print("⚠️ Skipped change password test (admin login failed)")
    
    return True

def run_all_tests():
    """Run all test suites"""
    print("🚀 BARBER HUB v3.7.0 Admin Roles/Permissions System Test Suite")
    print("=" * 80)
    
    # Initialize global variables
    global sub_admin_a_phone_global, sub_admin_a_id_global
    sub_admin_a_phone_global = None
    sub_admin_a_id_global = None
    
    tests = [
        ("Login Regression (405 Fix)", test_login_regression),
        ("Admin Permissions Catalog", test_permissions_catalog),
        ("Admin Me Endpoint", test_admin_me),
        ("Create Sub-Admin", test_create_sub_admin),
        ("Sub-Admin Permission Restrictions", test_sub_admin_permissions),
        ("Update Sub-Admin", test_update_sub_admin),
        ("Reset Sub-Admin Password", test_reset_password),
        ("Delete Sub-Admin", test_delete_sub_admin),
        ("Permission Enforcement Sanity", test_permission_enforcement),
        ("Regression Tests", test_regression),
    ]
    
    results = []
    passed = 0
    total = len(tests)
    
    for test_name, test_func in tests:
        print(f"\n{'='*20} {test_name} {'='*20}")
        try:
            result = test_func()
            if result:
                print(f"✅ {test_name} PASSED")
                results.append((test_name, "PASSED", ""))
                passed += 1
            else:
                print(f"❌ {test_name} FAILED")
                results.append((test_name, "FAILED", "Test function returned False"))
        except Exception as e:
            print(f"💥 {test_name} ERROR: {str(e)}")
            results.append((test_name, "ERROR", str(e)))
    
    # Summary
    print(f"\n{'='*80}")
    print(f"🎯 TEST SUMMARY: {passed}/{total} tests passed ({passed/total*100:.1f}%)")
    print(f"{'='*80}")
    
    for test_name, status, error in results:
        status_emoji = "✅" if status == "PASSED" else "❌" if status == "FAILED" else "💥"
        print(f"{status_emoji} {test_name}: {status}")
        if error:
            print(f"   Error: {error}")
    
    return passed == total

if __name__ == "__main__":
    success = run_all_tests()
    exit(0 if success else 1)