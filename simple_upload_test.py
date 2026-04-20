#!/usr/bin/env python3
"""
Simple test for gallery upload functionality
"""

import requests
import json

BASE_URL = "https://vuln-checker-8.preview.emergentagent.com/api"
SALON_CREDENTIALS = {"phone_number": "0935964158", "password": "salon123"}

def test_single_upload():
    print("🧪 Testing single gallery upload...")
    
    # Login as salon
    login_response = requests.post(f"{BASE_URL}/auth/login", json=SALON_CREDENTIALS)
    if login_response.status_code != 200:
        print("❌ Failed to login as salon")
        return False
        
    token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # Get profile to get shop_id
    profile_response = requests.get(f"{BASE_URL}/barbers/profile/me", headers=headers)
    if profile_response.status_code != 200:
        print("❌ Failed to get salon profile")
        return False
        
    shop_id = profile_response.json()["id"]
    print(f"Shop ID: {shop_id}")
    
    # Check current gallery count
    gallery_response = requests.get(f"{BASE_URL}/barbershops/{shop_id}/gallery")
    if gallery_response.status_code == 200:
        current_count = len(gallery_response.json())
        print(f"Current gallery count: {current_count}")
    
    # Try to upload one image
    test_image = {
        "image_after": "https://example.com/test1.jpg",
        "image_before": "",
        "caption": "Test Upload"
    }
    
    upload_response = requests.post(f"{BASE_URL}/barbershops/me/gallery", json=test_image, headers=headers)
    print(f"Upload response: {upload_response.status_code}")
    
    if upload_response.status_code == 200:
        response_data = upload_response.json()
        print(f"✅ Upload successful! Response: {response_data}")
        return True
    else:
        print(f"❌ Upload failed: {upload_response.text}")
        return False

if __name__ == "__main__":
    test_single_upload()