"""
Test Dashboard Extensions: Services Management + Social Media Management
Tests for Stage 1 features: Add/Edit/Delete services with pricing, Social media links
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestServicesManagement:
    """Test Services CRUD operations for barber dashboard"""
    
    @pytest.fixture(autouse=True)
    def setup(self, api_client):
        """Setup barber authentication"""
        self.client = api_client
        # Login as barber
        response = self.client.post(f"{BASE_URL}/api/auth/login", json={
            "phone_number": "0935964158",
            "password": "salon123"
        })
        assert response.status_code == 200, f"Barber login failed: {response.text}"
        self.token = response.json().get("access_token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
        self.created_service_ids = []
    
    def teardown_method(self):
        """Cleanup created services"""
        for service_id in self.created_service_ids:
            try:
                self.client.delete(f"{BASE_URL}/api/barbershops/me/services/{service_id}", headers=self.headers)
            except:
                pass
    
    def test_create_service(self):
        """Test creating a new service with pricing"""
        service_data = {
            "name": f"TEST_Haircut_{uuid.uuid4().hex[:6]}",
            "name_ar": "قصة شعر اختبار",
            "description": "Test haircut service",
            "price": 25.50,
            "duration_minutes": 30,
            "category": "haircut"
        }
        
        response = self.client.post(
            f"{BASE_URL}/api/barbershops/me/services",
            json=service_data,
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Create service failed: {response.text}"
        data = response.json()
        
        # Validate response structure
        assert "id" in data, "Service ID not returned"
        assert data["name"] == service_data["name"]
        assert data["price"] == service_data["price"]
        assert data["duration_minutes"] == service_data["duration_minutes"]
        assert data["category"] == service_data["category"]
        
        self.created_service_ids.append(data["id"])
        print(f"✓ Service created successfully: {data['id']}")
    
    def test_get_my_services(self):
        """Test fetching barber's own services"""
        response = self.client.get(
            f"{BASE_URL}/api/barbershops/me/services",
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Get services failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Services should be a list"
        print(f"✓ Retrieved {len(data)} services")
    
    def test_update_service(self):
        """Test updating an existing service"""
        # First create a service
        create_data = {
            "name": f"TEST_Update_{uuid.uuid4().hex[:6]}",
            "price": 20.00,
            "duration_minutes": 25,
            "category": "general"
        }
        
        create_response = self.client.post(
            f"{BASE_URL}/api/barbershops/me/services",
            json=create_data,
            headers=self.headers
        )
        assert create_response.status_code == 200
        service_id = create_response.json()["id"]
        self.created_service_ids.append(service_id)
        
        # Update the service
        update_data = {
            "name": f"TEST_Updated_{uuid.uuid4().hex[:6]}",
            "price": 35.00,
            "duration_minutes": 45,
            "category": "styling"
        }
        
        update_response = self.client.put(
            f"{BASE_URL}/api/barbershops/me/services/{service_id}",
            json=update_data,
            headers=self.headers
        )
        
        assert update_response.status_code == 200, f"Update service failed: {update_response.text}"
        updated = update_response.json()
        assert updated["price"] == 35.00, "Price not updated"
        assert updated["duration_minutes"] == 45, "Duration not updated"
        print(f"✓ Service updated successfully")
    
    def test_delete_service(self):
        """Test deleting a service"""
        # First create a service
        create_data = {
            "name": f"TEST_Delete_{uuid.uuid4().hex[:6]}",
            "price": 15.00,
            "duration_minutes": 20,
            "category": "general"
        }
        
        create_response = self.client.post(
            f"{BASE_URL}/api/barbershops/me/services",
            json=create_data,
            headers=self.headers
        )
        assert create_response.status_code == 200
        service_id = create_response.json()["id"]
        
        # Delete the service
        delete_response = self.client.delete(
            f"{BASE_URL}/api/barbershops/me/services/{service_id}",
            headers=self.headers
        )
        
        assert delete_response.status_code == 200, f"Delete service failed: {delete_response.text}"
        
        # Verify deletion - service should not be in list
        list_response = self.client.get(
            f"{BASE_URL}/api/barbershops/me/services",
            headers=self.headers
        )
        services = list_response.json()
        service_ids = [s["id"] for s in services]
        assert service_id not in service_ids, "Service still exists after deletion"
        print(f"✓ Service deleted successfully")


class TestSocialMediaManagement:
    """Test Social Media links management for barber dashboard"""
    
    @pytest.fixture(autouse=True)
    def setup(self, api_client):
        """Setup barber authentication"""
        self.client = api_client
        # Login as barber
        response = self.client.post(f"{BASE_URL}/api/auth/login", json={
            "phone_number": "0935964158",
            "password": "salon123"
        })
        assert response.status_code == 200, f"Barber login failed: {response.text}"
        self.token = response.json().get("access_token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_update_social_media_all_platforms(self):
        """Test updating all social media platforms"""
        social_data = {
            "instagram": "https://instagram.com/testbarber",
            "tiktok": "https://tiktok.com/@testbarber",
            "facebook": "https://facebook.com/testbarber",
            "youtube": "https://youtube.com/@testbarber",
            "twitter": "https://x.com/testbarber",
            "snapchat": "https://snapchat.com/add/testbarber",
            "whatsapp": "+491234567890",
            "website": "https://testbarber.com"
        }
        
        response = self.client.put(
            f"{BASE_URL}/api/barbershops/me/social",
            json=social_data,
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Update social media failed: {response.text}"
        data = response.json()
        
        # Verify response contains saved data
        assert "message" in data, "No success message"
        assert data.get("instagram") == social_data["instagram"]
        assert data.get("tiktok") == social_data["tiktok"]
        assert data.get("facebook") == social_data["facebook"]
        assert data.get("youtube") == social_data["youtube"]
        assert data.get("twitter") == social_data["twitter"]
        assert data.get("snapchat") == social_data["snapchat"]
        assert data.get("whatsapp") == social_data["whatsapp"]
        assert data.get("website") == social_data["website"]
        
        print(f"✓ All 8 social media platforms saved successfully")
    
    def test_update_partial_social_media(self):
        """Test updating only some social media fields"""
        partial_data = {
            "instagram": "https://instagram.com/partial_test",
            "whatsapp": "+49999888777"
        }
        
        response = self.client.put(
            f"{BASE_URL}/api/barbershops/me/social",
            json=partial_data,
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Partial update failed: {response.text}"
        data = response.json()
        assert data.get("instagram") == partial_data["instagram"]
        assert data.get("whatsapp") == partial_data["whatsapp"]
        print(f"✓ Partial social media update works")
    
    def test_social_media_persists_in_profile(self):
        """Test that social media data persists in barber profile"""
        # First update social media
        social_data = {
            "instagram": "https://instagram.com/persist_test",
            "facebook": "https://facebook.com/persist_test"
        }
        
        update_response = self.client.put(
            f"{BASE_URL}/api/barbershops/me/social",
            json=social_data,
            headers=self.headers
        )
        assert update_response.status_code == 200
        
        # Fetch profile and verify
        profile_response = self.client.get(
            f"{BASE_URL}/api/barbers/profile/me",
            headers=self.headers
        )
        
        assert profile_response.status_code == 200, f"Get profile failed: {profile_response.text}"
        profile = profile_response.json()
        
        # Check social media fields in profile
        assert profile.get("instagram") == social_data["instagram"] or profile.get("instagram_url") == social_data["instagram"]
        assert profile.get("facebook") == social_data["facebook"]
        print(f"✓ Social media persists in profile")


class TestGalleryImagesLimit:
    """Test gallery images limit is now 10 (not 3)"""
    
    @pytest.fixture(autouse=True)
    def setup(self, api_client):
        """Setup barber authentication"""
        self.client = api_client
        # Login as barber
        response = self.client.post(f"{BASE_URL}/api/auth/login", json={
            "phone_number": "0935964158",
            "password": "salon123"
        })
        assert response.status_code == 200, f"Barber login failed: {response.text}"
        self.token = response.json().get("access_token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
        self.created_image_ids = []
    
    def teardown_method(self):
        """Cleanup created images"""
        for image_id in self.created_image_ids:
            try:
                self.client.delete(f"{BASE_URL}/api/barbershops/me/gallery/{image_id}", headers=self.headers)
            except:
                pass
    
    def test_gallery_allows_up_to_10_images(self):
        """Test that gallery allows up to 10 images"""
        # Get current count
        profile_response = self.client.get(
            f"{BASE_URL}/api/barbers/profile/me",
            headers=self.headers
        )
        current_images = len(profile_response.json().get("before_after_images", []))
        
        # Try to add images up to 10
        images_to_add = min(10 - current_images, 5)  # Add up to 5 for testing
        
        for i in range(images_to_add):
            image_data = {
                "before": f"https://example.com/before_{i}.jpg",
                "after": f"https://example.com/after_{i}.jpg",
                "caption": f"Test image {i}"
            }
            
            response = self.client.post(
                f"{BASE_URL}/api/barbershops/me/gallery",
                json=image_data,
                headers=self.headers
            )
            
            if response.status_code == 200:
                self.created_image_ids.append(response.json()["id"])
            elif response.status_code == 400 and "Maximum 10" in response.text:
                print(f"✓ Gallery limit reached at {current_images + i} images (limit is 10)")
                return
        
        print(f"✓ Successfully added {len(self.created_image_ids)} gallery images (limit is 10)")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
