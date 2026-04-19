#!/usr/bin/env python3
"""
Verify the exact error message for 5th upload
"""

import requests
import json

BASE_URL = "https://web-repo-tool.preview.emergentagent.com/api"
SALON_CREDENTIALS = {"phone_number": "0935964158", "password": "salon123"}

def verify_error_message():
    print("🧪 Verifying exact error message for 5th upload...")
    
    # Login as salon
    login_response = requests.post(f"{BASE_URL}/auth/login", json=SALON_CREDENTIALS)
    token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # Try to upload 5th image
    test_image = {
        "image_after": "https://example.com/should_fail.jpg",
        "image_before": "",
        "caption": "Should Fail"
    }
    
    upload_response = requests.post(f"{BASE_URL}/barbershops/me/gallery", json=test_image, headers=headers)
    
    print(f"Status Code: {upload_response.status_code}")
    if upload_response.status_code == 400:
        response_data = upload_response.json()
        error_message = response_data.get("detail", "")
        print(f"Error Message: '{error_message}'")
        
        expected_message = "Maximum 4 portfolio images allowed. Please delete one to add a new image."
        if error_message == expected_message:
            print("✅ Error message matches exactly!")
            return True
        else:
            print(f"❌ Error message mismatch. Expected: '{expected_message}'")
            return False
    else:
        print(f"❌ Expected 400, got {upload_response.status_code}")
        return False

if __name__ == "__main__":
    verify_error_message()