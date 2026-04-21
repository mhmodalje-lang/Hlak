#!/usr/bin/env python3
"""
BARBER HUB v3.7.0 Admin Roles/Permissions System - Quick Admin Test
Testing admin functionality now that rate limit is cleared
"""

import requests
import json
import random
import string

# Configuration
BASE_URL = "https://security-audit-110.preview.emergentagent.com/api"
ADMIN_PHONE = "admin"
ADMIN_PASSWORD = "NewStrong2026!xYz"
MASTER_OWNER_EMAIL = "mohamadalrejab@gmail.com"

def get_admin_token():
    """Get admin token"""
    login_payload = {"phone_number": ADMIN_PHONE, "password": ADMIN_PASSWORD}
    response = requests.post(f"{BASE_URL}/auth/login", json=login_payload)
    if response.status_code == 200:
        return response.json()["access_token"]
    else:
        print(f"❌ Failed to get admin token: {response.status_code} - {response.text}")
        return None

def test_admin_permissions_catalog():
    """Test GET /api/admin/permissions/catalog"""
    print("=== Testing Admin Permissions Catalog ===")
    
    token = get_admin_token()
    if not token:
        return False
    
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{BASE_URL}/admin/permissions/catalog", headers=headers)
    print(f"Permissions catalog response: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        if "permissions" in data and "master_owner_email" in data:
            permissions = data["permissions"]
            master_email = data["master_owner_email"]
            print(f"✅ Permissions catalog: {len(permissions)} permissions")
            print(f"✅ Master owner email: {master_email}")
            
            if len(permissions) == 12 and master_email == MASTER_OWNER_EMAIL:
                print("✅ Correct permissions count and master owner email")
                return True
            else:
                print(f"❌ Expected 12 permissions and {MASTER_OWNER_EMAIL}")
                return False
        else:
            print("❌ Missing required fields in response")
            return False
    else:
        print(f"❌ Failed: {response.status_code} - {response.text}")
        return False

def test_admin_me():
    """Test GET /api/admin/me"""
    print("\n=== Testing Admin Me Endpoint ===")
    
    token = get_admin_token()
    if not token:
        return False
    
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{BASE_URL}/admin/me", headers=headers)
    print(f"Admin me response: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        required_fields = ["id", "phone_number", "email", "full_name", "is_master", "permissions", "must_change_password"]
        
        for field in required_fields:
            if field not in data:
                print(f"❌ Missing field: {field}")
                return False
        
        print(f"✅ is_master: {data['is_master']}")
        print(f"✅ permissions count: {len(data['permissions'])}")
        print(f"✅ must_change_password: {data['must_change_password']}")
        print(f"✅ email: {data['email']}")
        
        if (data["is_master"] == True and 
            len(data["permissions"]) == 12 and 
            data["must_change_password"] == False and
            data["email"] == MASTER_OWNER_EMAIL):
            print("✅ Master admin profile correct")
            return True
        else:
            print("❌ Master admin data incorrect")
            return False
    else:
        print(f"❌ Failed: {response.status_code} - {response.text}")
        return False

def test_create_sub_admin():
    """Test POST /api/admin/sub-admins"""
    print("\n=== Testing Create Sub-Admin ===")
    
    token = get_admin_token()
    if not token:
        return False
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # Create sub-admin with limited permissions
    sub_admin_phone = "+9639992700" + ''.join(random.choices(string.digits, k=4))
    sub_admin_payload = {
        "phone_number": sub_admin_phone,
        "email": "subadmin.test@example.com",
        "full_name": "Test Sub Admin",
        "password": "SubAdmin123!",
        "permissions": ["view_stats", "support"],
        "note": "Test sub-admin"
    }
    
    response = requests.post(f"{BASE_URL}/admin/sub-admins", json=sub_admin_payload, headers=headers)
    print(f"Create sub-admin response: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        if "admin" in data and data["admin"]["is_master"] == False:
            print("✅ Sub-admin created successfully")
            print(f"✅ Sub-admin ID: {data['admin']['id']}")
            print(f"✅ must_change_password: {data['admin'].get('must_change_password')}")
            
            # Test invalid permission
            print("\nTesting invalid permission...")
            invalid_payload = {
                "phone_number": "+9639992800" + ''.join(random.choices(string.digits, k=4)),
                "email": "invalid@test.com",
                "full_name": "Invalid Permission User",
                "password": "ValidPass123!",
                "permissions": ["steal_keys"]  # Invalid permission
            }
            
            response = requests.post(f"{BASE_URL}/admin/sub-admins", json=invalid_payload, headers=headers)
            print(f"Invalid permission response: {response.status_code}")
            
            if response.status_code == 422 and "Unknown permission" in response.text:
                print("✅ Correctly rejected invalid permission")
                return True
            else:
                print(f"❌ Should reject invalid permission with 422")
                return False
        else:
            print("❌ Sub-admin creation response invalid")
            return False
    else:
        print(f"❌ Failed: {response.status_code} - {response.text}")
        return False

def test_master_owner_protection():
    """Test Master Owner protection"""
    print("\n=== Testing Master Owner Protection ===")
    
    token = get_admin_token()
    if not token:
        return False
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # Test creating sub-admin with master owner email
    print("Testing master owner email restriction...")
    master_email_payload = {
        "phone_number": "+9639992900" + ''.join(random.choices(string.digits, k=4)),
        "email": MASTER_OWNER_EMAIL,
        "full_name": "Fake Master",
        "password": "FakeMaster123!",
        "permissions": ["view_stats"]
    }
    
    response = requests.post(f"{BASE_URL}/admin/sub-admins", json=master_email_payload, headers=headers)
    print(f"Master email response: {response.status_code}")
    
    if response.status_code == 400 and "reserved for the Master Owner" in response.text:
        print("✅ Correctly rejected master owner email")
        return True
    else:
        print(f"❌ Should reject master owner email with 400")
        return False

def run_admin_tests():
    """Run admin-specific tests"""
    print("🚀 BARBER HUB v3.7.0 Admin System - Quick Admin Test")
    print("=" * 80)
    
    tests = [
        ("Admin Permissions Catalog", test_admin_permissions_catalog),
        ("Admin Me Endpoint", test_admin_me),
        ("Create Sub-Admin", test_create_sub_admin),
        ("Master Owner Protection", test_master_owner_protection),
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
    print(f"🎯 ADMIN TEST SUMMARY: {passed}/{total} tests passed ({passed/total*100:.1f}%)")
    print(f"{'='*80}")
    
    for test_name, status, error in results:
        status_emoji = "✅" if status == "PASSED" else "❌" if status == "FAILED" else "💥"
        print(f"{status_emoji} {test_name}: {status}")
        if error:
            print(f"   Error: {error}")
    
    return passed == total

if __name__ == "__main__":
    success = run_admin_tests()
    exit(0 if success else 1)