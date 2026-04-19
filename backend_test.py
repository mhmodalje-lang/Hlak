#!/usr/bin/env python3
"""
BARBER HUB Portfolio/Gallery Backend Testing
Testing Phase 2 changes: Max portfolio images reduced from 10 to 4
"""

import requests
import json
import sys
from typing import Dict, Any, Optional

# API Configuration
BASE_URL = "https://web-repo-tool.preview.emergentagent.com/api"

# Test Credentials
ADMIN_CREDENTIALS = {"phone_number": "admin", "password": "admin123"}
SALON_CREDENTIALS = {"phone_number": "0935964158", "password": "salon123"}

class PortfolioTester:
    def __init__(self):
        self.admin_token = None
        self.salon_token = None
        self.shop_id = None
        self.uploaded_image_ids = []
        self.test_results = []
        
    def log_test(self, test_name: str, success: bool, details: str = ""):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        result = f"{status} - {test_name}"
        if details:
            result += f": {details}"
        print(result)
        self.test_results.append({
            "test": test_name,
            "success": success,
            "details": details
        })
        
    def make_request(self, method: str, endpoint: str, data: Dict = None, 
                    headers: Dict = None, expected_status: int = 200) -> Optional[Dict]:
        """Make HTTP request with error handling"""
        url = f"{BASE_URL}{endpoint}"
        
        try:
            if method.upper() == "GET":
                response = requests.get(url, headers=headers)
            elif method.upper() == "POST":
                response = requests.post(url, json=data, headers=headers)
            elif method.upper() == "DELETE":
                response = requests.delete(url, headers=headers)
            else:
                raise ValueError(f"Unsupported method: {method}")
                
            print(f"  {method} {endpoint} -> {response.status_code}")
            
            if response.status_code != expected_status:
                print(f"  Expected {expected_status}, got {response.status_code}")
                if response.text:
                    print(f"  Response: {response.text[:200]}")
                return None
                
            if response.content:
                return response.json()
            return {}
            
        except Exception as e:
            print(f"  Request failed: {str(e)}")
            return None
    
    def test_1_seed_data(self):
        """Test 1: POST /api/seed (admin auth) - create seed data"""
        print("\n1. Testing seed data creation...")
        
        # First login as admin
        login_data = self.make_request("POST", "/auth/login", ADMIN_CREDENTIALS)
        if not login_data or "access_token" not in login_data:
            self.log_test("Admin Login", False, "Failed to get admin access token")
            return False
            
        self.admin_token = login_data["access_token"]
        self.log_test("Admin Login", True, "Got admin access token")
        
        # Create seed data
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        seed_data = self.make_request("POST", "/seed", headers=headers)
        
        if seed_data and "message" in seed_data:
            # Check if 10 shops were created/exist
            shops_data = self.make_request("GET", "/barbers")
            if shops_data and len(shops_data) >= 10:
                self.log_test("Seed Data Creation", True, f"Created/verified {len(shops_data)} shops")
                return True
            else:
                self.log_test("Seed Data Creation", False, f"Expected 10+ shops, got {len(shops_data) if shops_data else 0}")
                return False
        else:
            self.log_test("Seed Data Creation", False, "Seed endpoint failed")
            return False
    
    def test_2_salon_login(self):
        """Test 2: POST /api/auth/login with salon credentials"""
        print("\n2. Testing salon login...")
        
        login_data = self.make_request("POST", "/auth/login", SALON_CREDENTIALS)
        if not login_data or "access_token" not in login_data:
            self.log_test("Salon Login", False, "Failed to get salon access token")
            return False
            
        self.salon_token = login_data["access_token"]
        
        # Get salon profile to get shop_id
        headers = {"Authorization": f"Bearer {self.salon_token}"}
        profile_data = self.make_request("GET", "/barbers/profile/me", headers=headers)
        
        if profile_data and "id" in profile_data:
            self.shop_id = profile_data["id"]
            self.log_test("Salon Login", True, f"Got salon token and shop_id: {self.shop_id}")
            return True
        else:
            self.log_test("Salon Login", False, "Failed to get shop_id from profile")
            return False
    
    def test_3_get_initial_gallery(self):
        """Test 3: GET /api/barbershops/{shop_id}/gallery"""
        print("\n3. Testing initial gallery fetch...")
        
        if not self.shop_id:
            self.log_test("Initial Gallery Fetch", False, "No shop_id available")
            return False
            
        gallery_data = self.make_request("GET", f"/barbershops/{self.shop_id}/gallery")
        
        if gallery_data is not None:
            gallery_count = len(gallery_data)
            self.log_test("Initial Gallery Fetch", True, f"Gallery has {gallery_count} images")
            return True
        else:
            self.log_test("Initial Gallery Fetch", False, "Failed to fetch gallery")
            return False
    
    def test_4_upload_4_images(self):
        """Test 4: POST /api/barbershops/me/gallery 4 times"""
        print("\n4. Testing upload of 4 portfolio images...")
        
        if not self.salon_token:
            self.log_test("Upload 4 Images", False, "No salon token available")
            return False
            
        headers = {"Authorization": f"Bearer {self.salon_token}"}
        
        # Test image URLs
        test_images = [
            {"image_after": "https://example.com/portfolio1.jpg", "image_before": "", "caption": "Haircut Style 1"},
            {"image_after": "https://example.com/portfolio2.jpg", "image_before": "", "caption": "Beard Trim"},
            {"image_after": "https://example.com/portfolio3.jpg", "image_before": "", "caption": "Hair Styling"},
            {"image_after": "https://example.com/portfolio4.jpg", "image_before": "", "caption": "Complete Makeover"}
        ]
        
        success_count = 0
        for i, image_data in enumerate(test_images, 1):
            print(f"  Uploading image {i}/4...")
            response_data = self.make_request("POST", "/barbershops/me/gallery", 
                                            image_data, headers)
            
            if response_data and "id" in response_data:
                self.uploaded_image_ids.append(response_data["id"])
                success_count += 1
                print(f"    ✅ Image {i} uploaded successfully, ID: {response_data['id']}")
            else:
                print(f"    ❌ Image {i} upload failed")
                
        if success_count == 4:
            self.log_test("Upload 4 Images", True, f"Successfully uploaded {success_count}/4 images")
            return True
        else:
            self.log_test("Upload 4 Images", False, f"Only uploaded {success_count}/4 images")
            return False
    
    def test_5_upload_5th_image_should_fail(self):
        """Test 5: POST 5th time - MUST return 400 error"""
        print("\n5. Testing 5th image upload (should fail with 400)...")
        
        if not self.salon_token:
            self.log_test("5th Image Upload (Should Fail)", False, "No salon token available")
            return False
            
        headers = {"Authorization": f"Bearer {self.salon_token}"}
        fifth_image = {"image_after": "https://example.com/portfolio5.jpg", "image_before": "", "caption": "Should Fail"}
        
        # This should return 400 error
        try:
            url = f"{BASE_URL}/barbershops/me/gallery"
            response = requests.post(url, json=fifth_image, headers=headers)
            
            print(f"  POST /barbershops/me/gallery -> {response.status_code}")
            
            if response.status_code == 400:
                response_data = response.json() if response.content else {}
                error_message = response_data.get("detail", "")
                expected_message = "Maximum 4 portfolio images allowed. Please delete one to add a new image."
                
                if expected_message in error_message:
                    self.log_test("5th Image Upload (Should Fail)", True, 
                                f"Correctly rejected with 400 and expected error message")
                    return True
                else:
                    self.log_test("5th Image Upload (Should Fail)", False, 
                                f"Got 400 but wrong error message: {error_message}")
                    return False
            else:
                self.log_test("5th Image Upload (Should Fail)", False, 
                            f"Expected 400, got {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("5th Image Upload (Should Fail)", False, f"Request failed: {str(e)}")
            return False
    
    def test_6_verify_barber_profile_has_4_images(self):
        """Test 6: GET /api/barbers/{shop_id} - verify before_after_images array has 4 items"""
        print("\n6. Testing barber profile has exactly 4 images...")
        
        if not self.shop_id:
            self.log_test("Verify 4 Images in Profile", False, "No shop_id available")
            return False
            
        profile_data = self.make_request("GET", f"/barbers/{self.shop_id}")
        
        if not profile_data:
            self.log_test("Verify 4 Images in Profile", False, "Failed to fetch barber profile")
            return False
            
        before_after_images = profile_data.get("before_after_images", [])
        image_count = len(before_after_images)
        
        if image_count == 4:
            # Verify each image has image_after/after field
            all_have_after = all(
                img.get("image_after") or img.get("after") 
                for img in before_after_images
            )
            
            if all_have_after:
                self.log_test("Verify 4 Images in Profile", True, 
                            f"Profile has exactly 4 images, all with after field populated")
                return True
            else:
                self.log_test("Verify 4 Images in Profile", False, 
                            "Some images missing image_after/after field")
                return False
        else:
            self.log_test("Verify 4 Images in Profile", False, 
                        f"Expected 4 images, got {image_count}")
            return False
    
    def test_7_delete_one_image(self):
        """Test 7: DELETE /api/barbershops/me/gallery/{image_id}"""
        print("\n7. Testing delete one portfolio image...")
        
        if not self.salon_token or not self.uploaded_image_ids:
            self.log_test("Delete One Image", False, "No salon token or uploaded images available")
            return False
            
        headers = {"Authorization": f"Bearer {self.salon_token}"}
        image_id_to_delete = self.uploaded_image_ids[0]  # Delete first image
        
        delete_response = self.make_request("DELETE", f"/barbershops/me/gallery/{image_id_to_delete}", 
                                          headers=headers)
        
        if delete_response is not None:
            # Remove from our tracking list
            self.uploaded_image_ids.remove(image_id_to_delete)
            self.log_test("Delete One Image", True, f"Successfully deleted image {image_id_to_delete}")
            return True
        else:
            self.log_test("Delete One Image", False, f"Failed to delete image {image_id_to_delete}")
            return False
    
    def test_8_upload_after_delete(self):
        """Test 8: POST again after delete - should succeed"""
        print("\n8. Testing upload after delete (should succeed)...")
        
        if not self.salon_token:
            self.log_test("Upload After Delete", False, "No salon token available")
            return False
            
        headers = {"Authorization": f"Bearer {self.salon_token}"}
        new_image = {"image_after": "https://example.com/portfolio_new.jpg", "image_before": "", "caption": "New Image After Delete"}
        
        response_data = self.make_request("POST", "/barbershops/me/gallery", 
                                        new_image, headers)
        
        if response_data and "id" in response_data:
            self.uploaded_image_ids.append(response_data["id"])
            self.log_test("Upload After Delete", True, 
                        f"Successfully uploaded new image after delete, ID: {response_data['id']}")
            return True
        else:
            self.log_test("Upload After Delete", False, "Failed to upload image after delete")
            return False
    
    def test_9_final_verification(self):
        """Test 9: GET /api/barbers/{shop_id} final verification - still 4 images"""
        print("\n9. Final verification - should still have 4 images...")
        
        if not self.shop_id:
            self.log_test("Final Verification", False, "No shop_id available")
            return False
            
        profile_data = self.make_request("GET", f"/barbers/{self.shop_id}")
        
        if not profile_data:
            self.log_test("Final Verification", False, "Failed to fetch barber profile")
            return False
            
        before_after_images = profile_data.get("before_after_images", [])
        image_count = len(before_after_images)
        
        if image_count == 4:
            self.log_test("Final Verification", True, 
                        f"Final verification passed - profile still has exactly 4 images")
            return True
        else:
            self.log_test("Final Verification", False, 
                        f"Expected 4 images, got {image_count}")
            return False
    
    def test_10_auth_failure(self):
        """Test 10: POST /api/barbershops/me/gallery WITHOUT Authorization header"""
        print("\n10. Testing auth failure (no Authorization header)...")
        
        test_image = {"image_after": "https://example.com/unauthorized.jpg", "image_before": "", "caption": "Should Fail"}
        
        try:
            url = f"{BASE_URL}/barbershops/me/gallery"
            response = requests.post(url, json=test_image)  # No headers
            
            print(f"  POST /barbershops/me/gallery (no auth) -> {response.status_code}")
            
            if response.status_code in [401, 403]:
                self.log_test("Auth Failure Test", True, 
                            f"Correctly rejected unauthorized request with {response.status_code}")
                return True
            else:
                self.log_test("Auth Failure Test", False, 
                            f"Expected 401/403, got {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Auth Failure Test", False, f"Request failed: {str(e)}")
            return False
    
    def run_all_tests(self):
        """Run all portfolio/gallery tests in sequence"""
        print("🧪 BARBER HUB Portfolio/Gallery Backend Testing")
        print("=" * 60)
        print("Testing Phase 2 changes: Max portfolio images reduced from 10 to 4")
        print("=" * 60)
        
        tests = [
            self.test_1_seed_data,
            self.test_2_salon_login,
            self.test_3_get_initial_gallery,
            self.test_4_upload_4_images,
            self.test_5_upload_5th_image_should_fail,
            self.test_6_verify_barber_profile_has_4_images,
            self.test_7_delete_one_image,
            self.test_8_upload_after_delete,
            self.test_9_final_verification,
            self.test_10_auth_failure
        ]
        
        passed = 0
        total = len(tests)
        
        for test_func in tests:
            try:
                if test_func():
                    passed += 1
            except Exception as e:
                print(f"❌ Test {test_func.__name__} crashed: {str(e)}")
        
        print("\n" + "=" * 60)
        print(f"📊 PORTFOLIO/GALLERY TESTING SUMMARY")
        print("=" * 60)
        print(f"✅ Passed: {passed}/{total}")
        print(f"❌ Failed: {total - passed}/{total}")
        
        if passed == total:
            print("🎉 ALL PORTFOLIO/GALLERY TESTS PASSED!")
            return True
        else:
            print("⚠️  Some tests failed - see details above")
            return False

if __name__ == "__main__":
    tester = PortfolioTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)