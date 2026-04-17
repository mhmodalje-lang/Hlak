#!/usr/bin/env python3
"""
Quick test for failing endpoints
"""

import requests
import json
import uuid

BASE_URL = "https://tech-state-doc.preview.emergentagent.com/api"

def test_review_and_subscription():
    # Register a new user
    user_data = {
        "phone_number": f"+963{uuid.uuid4().hex[:8]}",
        "password": "test123",
        "full_name": "Test User",
        "gender": "male",
        "country": "SY",
        "city": "الحسكة"
    }
    
    response = requests.post(f"{BASE_URL}/auth/register", json=user_data)
    if response.status_code != 200:
        print(f"❌ User registration failed: {response.text}")
        return
    
    user_token = response.json()["access_token"]
    user_id = response.json()["user"]["id"]
    print(f"✅ User registered: {user_id}")
    
    # Register a barbershop
    barber_data = {
        "owner_name": "Test Barber",
        "shop_name": "Test Shop",
        "shop_type": "male",
        "phone_number": f"+963{uuid.uuid4().hex[:8]}",
        "password": "test123",
        "country": "SY",
        "city": "الحسكة"
    }
    
    response = requests.post(f"{BASE_URL}/auth/register-barbershop", json=barber_data)
    if response.status_code != 200:
        print(f"❌ Barbershop registration failed: {response.text}")
        return
    
    barber_token = response.json()["access_token"]
    barber_id = response.json()["user"]["id"]
    print(f"✅ Barbershop registered: {barber_id}")
    
    # Test subscription creation
    print("\n🧪 Testing subscription creation...")
    sub_data = {
        "plan_type": "annual",
        "amount": 100.0,
        "payment_method": "bank_transfer"
    }
    
    headers = {"Authorization": f"Bearer {barber_token}", "Content-Type": "application/json"}
    response = requests.post(f"{BASE_URL}/subscriptions", json=sub_data, headers=headers)
    
    print(f"Subscription Status: {response.status_code}")
    if response.status_code == 200:
        print(f"✅ Subscription created successfully")
        print(f"Response: {response.json()}")
    else:
        print(f"❌ Subscription failed: {response.text}")
    
    # Test review creation
    print("\n🧪 Testing review creation...")
    review_data = {
        "barber_id": barber_id,
        "rating": 5,
        "comment": "Great service!"
    }
    
    headers = {"Authorization": f"Bearer {user_token}", "Content-Type": "application/json"}
    response = requests.post(f"{BASE_URL}/reviews", json=review_data, headers=headers)
    
    print(f"Review Status: {response.status_code}")
    if response.status_code == 200:
        print(f"✅ Review created successfully")
        print(f"Response: {response.json()}")
    else:
        print(f"❌ Review failed: {response.text}")

if __name__ == "__main__":
    test_review_and_subscription()