#!/usr/bin/env python3
"""
BARBER HUB Portfolio/Gallery Backend Testing - Clear Gallery First
"""

import requests
import json

# API Configuration
BASE_URL = "https://barber-finder-26.preview.emergentagent.com/api"
SALON_CREDENTIALS = {"phone_number": "0935964158", "password": "salon123"}

def clear_gallery():
    """Clear existing gallery images first"""
    print("🧹 Clearing existing gallery images...")
    
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
    
    # Get current gallery
    gallery_response = requests.get(f"{BASE_URL}/barbershops/{shop_id}/gallery")
    if gallery_response.status_code != 200:
        print("❌ Failed to get gallery")
        return False
        
    gallery_images = gallery_response.json()
    print(f"Found {len(gallery_images)} existing images")
    
    # Delete each image
    deleted_count = 0
    for image in gallery_images:
        image_id = image.get("id")
        if image_id:
            delete_response = requests.delete(f"{BASE_URL}/barbershops/me/gallery/{image_id}", headers=headers)
            if delete_response.status_code == 200:
                deleted_count += 1
                print(f"✅ Deleted image {image_id}")
            else:
                print(f"❌ Failed to delete image {image_id}: {delete_response.status_code}")
    
    print(f"🧹 Cleared {deleted_count}/{len(gallery_images)} images")
    
    # Verify gallery is empty
    final_gallery_response = requests.get(f"{BASE_URL}/barbershops/{shop_id}/gallery")
    if final_gallery_response.status_code == 200:
        final_count = len(final_gallery_response.json())
        print(f"✅ Gallery now has {final_count} images")
        return final_count == 0
    
    return False

if __name__ == "__main__":
    clear_gallery()