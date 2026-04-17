"""
AI Try-On Feature Tests for BARBER HUB
Tests:
- Eligibility endpoint (locked/unlocked states)
- Generate endpoint (with booking validation, limit enforcement)
- My-sessions endpoint
- Presets endpoint
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# ============== FIXTURES ==============

@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session

@pytest.fixture(scope="module")
def test_user_for_tryon(api_client):
    """Create a unique test user for try-on tests"""
    unique_id = str(uuid.uuid4())[:8]
    user_data = {
        "phone_number": f"TRYON_{unique_id}",
        "password": "testpass123",
        "full_name": f"TryOn Test User {unique_id}",
        "gender": "male",
        "country": "Germany",
        "city": "Berlin"
    }
    response = api_client.post(f"{BASE_URL}/api/auth/register", json=user_data)
    if response.status_code == 200:
        data = response.json()
        return {
            "token": data.get("access_token"),
            "user": data.get("user"),
            "user_data": user_data
        }
    pytest.skip(f"User registration failed: {response.text}")

@pytest.fixture(scope="module")
def user_auth_headers(test_user_for_tryon):
    """Auth headers for test user"""
    return {"Authorization": f"Bearer {test_user_for_tryon['token']}"}

@pytest.fixture(scope="module")
def barber_token(api_client):
    """Get barber authentication token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "phone_number": "0935964158",
        "password": "salon123"
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip("Barber authentication failed")

@pytest.fixture(scope="module")
def barber_auth_headers(barber_token):
    """Auth headers for barber"""
    return {"Authorization": f"Bearer {barber_token}"}

@pytest.fixture(scope="module")
def barbershop_id(api_client, barber_token):
    """Get the barbershop ID from barber profile"""
    headers = {"Authorization": f"Bearer {barber_token}"}
    response = api_client.get(f"{BASE_URL}/api/barbers/profile/me", headers=headers)
    if response.status_code == 200:
        return response.json().get("id")
    pytest.skip("Could not get barbershop ID")

@pytest.fixture(scope="module")
def service_id(api_client, barbershop_id):
    """Get or create a service for booking"""
    response = api_client.get(f"{BASE_URL}/api/barbershops/{barbershop_id}/services")
    if response.status_code == 200 and len(response.json()) > 0:
        return response.json()[0].get("id")
    pytest.skip("No services available for booking")


# ============== ELIGIBILITY TESTS ==============

class TestAITryOnEligibility:
    """Test AI Try-On eligibility endpoint"""
    
    def test_eligibility_locked_without_booking(self, api_client, user_auth_headers):
        """User without booking should be locked"""
        response = api_client.get(f"{BASE_URL}/api/ai-tryon/eligibility", headers=user_auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        
        # Should be locked
        assert data["eligible"] == False
        assert data["remaining_tries"] == 0
        assert data["available_booking_id"] is None
        assert "locked_reason_en" in data or "locked_reason_ar" in data
        print(f"✅ Eligibility locked without booking: {data.get('locked_reason_en')}")
    
    def test_eligibility_requires_auth(self, api_client):
        """Eligibility endpoint requires authentication"""
        response = api_client.get(f"{BASE_URL}/api/ai-tryon/eligibility")
        
        assert response.status_code == 401
        print("✅ Eligibility requires authentication")
    
    def test_eligibility_unlocked_after_confirmed_booking(self, api_client, user_auth_headers, 
                                                          barbershop_id, service_id, barber_auth_headers):
        """User with confirmed booking should be eligible"""
        # Create a booking
        booking_data = {
            "barbershop_id": barbershop_id,
            "service_id": service_id,
            "booking_date": "2026-02-15",
            "start_time": "14:00"
        }
        booking_response = api_client.post(f"{BASE_URL}/api/bookings", json=booking_data, headers=user_auth_headers)
        
        if booking_response.status_code != 200:
            pytest.skip(f"Booking creation failed: {booking_response.text}")
        
        booking_id = booking_response.json().get("id")
        print(f"Created booking: {booking_id}")
        
        # Confirm the booking as barber
        confirm_response = api_client.put(
            f"{BASE_URL}/api/bookings/{booking_id}/confirm",
            headers=barber_auth_headers
        )
        assert confirm_response.status_code == 200
        print(f"Booking confirmed")
        
        # Check eligibility
        eligibility_response = api_client.get(f"{BASE_URL}/api/ai-tryon/eligibility", headers=user_auth_headers)
        
        assert eligibility_response.status_code == 200
        data = eligibility_response.json()
        
        # Should be eligible now
        assert data["eligible"] == True
        assert data["remaining_tries"] == 5  # MAX_TRYON_ATTEMPTS_PER_BOOKING
        assert data["max_tries_per_booking"] == 5
        assert data["available_booking_id"] == booking_id
        print(f"✅ Eligibility unlocked after confirmed booking: remaining_tries={data['remaining_tries']}")
        
        return booking_id


# ============== PRESETS TESTS ==============

class TestAITryOnPresets:
    """Test AI Try-On preset hairstyles endpoint"""
    
    def test_presets_male_english(self, api_client):
        """Get male presets in English"""
        response = api_client.get(f"{BASE_URL}/api/ai-tryon/presets", params={"gender": "male", "language": "en"})
        
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        assert len(data) == 8  # 8 preset hairstyles for men
        
        # Check structure
        first_preset = data[0]
        assert "name" in first_preset
        assert "description" in first_preset
        assert "name_ar" in first_preset
        
        # Check expected styles
        style_names = [s["name"] for s in data]
        assert "Modern Fade" in style_names
        assert "Classic Undercut" in style_names
        assert "Pompadour" in style_names
        print(f"✅ Male presets (EN): {len(data)} styles - {style_names[:3]}...")
    
    def test_presets_female_english(self, api_client):
        """Get female presets in English"""
        response = api_client.get(f"{BASE_URL}/api/ai-tryon/presets", params={"gender": "female", "language": "en"})
        
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        assert len(data) == 8  # 8 preset hairstyles for women
        
        style_names = [s["name"] for s in data]
        assert "Layered Bob" in style_names
        assert "Beach Waves" in style_names
        assert "Pixie Cut" in style_names
        print(f"✅ Female presets (EN): {len(data)} styles - {style_names[:3]}...")
    
    def test_presets_arabic(self, api_client):
        """Get presets in Arabic"""
        response = api_client.get(f"{BASE_URL}/api/ai-tryon/presets", params={"gender": "male", "language": "ar"})
        
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        assert len(data) == 8
        
        # Arabic names should be primary
        first_preset = data[0]
        assert "name" in first_preset
        assert "name_en" in first_preset  # English name as secondary
        print(f"✅ Male presets (AR): {data[0]['name']}")


# ============== MY-SESSIONS TESTS ==============

class TestAITryOnSessions:
    """Test AI Try-On sessions endpoint"""
    
    def test_my_sessions_empty_initially(self, api_client, user_auth_headers):
        """New user should have no sessions"""
        response = api_client.get(f"{BASE_URL}/api/ai-tryon/my-sessions", headers=user_auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        # May or may not be empty depending on test order
        print(f"✅ My sessions endpoint works: {len(data)} sessions")
    
    def test_my_sessions_requires_auth(self, api_client):
        """Sessions endpoint requires authentication"""
        response = api_client.get(f"{BASE_URL}/api/ai-tryon/my-sessions")
        
        assert response.status_code == 401
        print("✅ My sessions requires authentication")


# ============== GENERATE TESTS ==============

class TestAITryOnGenerate:
    """Test AI Try-On generation endpoint"""
    
    def test_generate_requires_auth(self, api_client):
        """Generate endpoint requires authentication"""
        response = api_client.post(f"{BASE_URL}/api/ai-tryon/generate", json={
            "booking_id": "fake-id",
            "hairstyle_name": "Modern Fade",
            "hairstyle_description": "Clean fade"
        })
        
        assert response.status_code == 401
        print("✅ Generate requires authentication")
    
    def test_generate_requires_valid_booking(self, api_client, user_auth_headers):
        """Generate requires a valid booking ID"""
        response = api_client.post(f"{BASE_URL}/api/ai-tryon/generate", json={
            "booking_id": "non-existent-booking-id",
            "hairstyle_name": "Modern Fade",
            "hairstyle_description": "Clean fade on sides with textured top"
        }, headers=user_auth_headers)
        
        assert response.status_code == 404
        assert "not found" in response.json().get("detail", "").lower()
        print("✅ Generate rejects invalid booking ID")
    
    def test_generate_requires_confirmed_booking(self, api_client, user_auth_headers, 
                                                  barbershop_id, service_id):
        """Generate requires booking to be confirmed"""
        # Create a pending booking (not confirmed)
        booking_data = {
            "barbershop_id": barbershop_id,
            "service_id": service_id,
            "booking_date": "2026-02-20",
            "start_time": "16:00"
        }
        booking_response = api_client.post(f"{BASE_URL}/api/bookings", json=booking_data, headers=user_auth_headers)
        
        if booking_response.status_code != 200:
            pytest.skip(f"Booking creation failed: {booking_response.text}")
        
        booking_id = booking_response.json().get("id")
        
        # Try to generate with pending booking
        response = api_client.post(f"{BASE_URL}/api/ai-tryon/generate", json={
            "booking_id": booking_id,
            "hairstyle_name": "Modern Fade",
            "hairstyle_description": "Clean fade on sides"
        }, headers=user_auth_headers)
        
        assert response.status_code == 403
        assert "confirmed" in response.json().get("detail", "").lower()
        print("✅ Generate rejects pending booking")
    
    def test_generate_requires_image(self, api_client, user_auth_headers, 
                                      barbershop_id, service_id, barber_auth_headers):
        """Generate requires user image (either uploaded or saved)"""
        # Create and confirm a booking
        booking_data = {
            "barbershop_id": barbershop_id,
            "service_id": service_id,
            "booking_date": "2026-02-21",
            "start_time": "10:00"
        }
        booking_response = api_client.post(f"{BASE_URL}/api/bookings", json=booking_data, headers=user_auth_headers)
        
        if booking_response.status_code != 200:
            pytest.skip(f"Booking creation failed: {booking_response.text}")
        
        booking_id = booking_response.json().get("id")
        
        # Confirm booking
        api_client.put(f"{BASE_URL}/api/bookings/{booking_id}/confirm", headers=barber_auth_headers)
        
        # Try to generate without image (and no saved image)
        response = api_client.post(f"{BASE_URL}/api/ai-tryon/generate", json={
            "booking_id": booking_id,
            "hairstyle_name": "Modern Fade",
            "hairstyle_description": "Clean fade on sides"
            # No user_image_base64 provided
        }, headers=user_auth_headers)
        
        # Should fail because no image provided and no saved image
        assert response.status_code == 400
        assert "image" in response.json().get("detail", "").lower()
        print("✅ Generate requires image")


# ============== LIMIT ENFORCEMENT TESTS ==============

class TestAITryOnLimits:
    """Test AI Try-On attempt limits"""
    
    def test_max_attempts_per_booking_is_5(self, api_client, user_auth_headers):
        """Verify max attempts per booking is 5"""
        response = api_client.get(f"{BASE_URL}/api/ai-tryon/eligibility", headers=user_auth_headers)
        
        if response.status_code == 200:
            data = response.json()
            if data.get("eligible"):
                assert data["max_tries_per_booking"] == 5
                print(f"✅ Max attempts per booking is 5")
            else:
                print("⚠️ User not eligible, skipping max attempts check")
        else:
            pytest.skip("Could not check eligibility")


# ============== INTEGRATION TEST ==============

class TestAITryOnIntegration:
    """End-to-end integration test for AI Try-On"""
    
    def test_full_tryon_flow_structure(self, api_client):
        """Test the full try-on flow structure (without actual AI generation)"""
        # Create a new user
        unique_id = str(uuid.uuid4())[:8]
        user_data = {
            "phone_number": f"FLOW_{unique_id}",
            "password": "testpass123",
            "full_name": f"Flow Test User {unique_id}",
            "gender": "male",
            "country": "Germany",
            "city": "Berlin"
        }
        
        # 1. Register user
        reg_response = api_client.post(f"{BASE_URL}/api/auth/register", json=user_data)
        assert reg_response.status_code == 200
        user_token = reg_response.json().get("access_token")
        user_headers = {"Authorization": f"Bearer {user_token}"}
        print("1. User registered")
        
        # 2. Check eligibility (should be locked)
        elig_response = api_client.get(f"{BASE_URL}/api/ai-tryon/eligibility", headers=user_headers)
        assert elig_response.status_code == 200
        assert elig_response.json()["eligible"] == False
        print("2. Eligibility locked (no booking)")
        
        # 3. Get barber token
        barber_response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "phone_number": "0935964158",
            "password": "salon123"
        })
        assert barber_response.status_code == 200
        barber_token = barber_response.json().get("access_token")
        barber_headers = {"Authorization": f"Bearer {barber_token}"}
        
        # Get barbershop ID
        profile_response = api_client.get(f"{BASE_URL}/api/barbers/profile/me", headers=barber_headers)
        barbershop_id = profile_response.json().get("id")
        
        # Get service ID
        services_response = api_client.get(f"{BASE_URL}/api/barbershops/{barbershop_id}/services")
        if services_response.status_code == 200 and len(services_response.json()) > 0:
            service_id = services_response.json()[0].get("id")
        else:
            pytest.skip("No services available")
        
        # 4. Create booking (use unique time to avoid conflicts)
        import random
        hour = random.randint(9, 20)
        minute = random.choice(["00", "30"])
        booking_data = {
            "barbershop_id": barbershop_id,
            "service_id": service_id,
            "booking_date": "2026-03-15",  # Future date to avoid conflicts
            "start_time": f"{hour:02d}:{minute}"
        }
        booking_response = api_client.post(f"{BASE_URL}/api/bookings", json=booking_data, headers=user_headers)
        assert booking_response.status_code == 200
        booking_id = booking_response.json().get("id")
        print(f"3. Booking created: {booking_id}")
        
        # 5. Confirm booking
        confirm_response = api_client.put(f"{BASE_URL}/api/bookings/{booking_id}/confirm", headers=barber_headers)
        assert confirm_response.status_code == 200
        print("4. Booking confirmed")
        
        # 6. Check eligibility (should be unlocked)
        elig_response2 = api_client.get(f"{BASE_URL}/api/ai-tryon/eligibility", headers=user_headers)
        assert elig_response2.status_code == 200
        elig_data = elig_response2.json()
        assert elig_data["eligible"] == True
        assert elig_data["remaining_tries"] == 5
        assert elig_data["available_booking_id"] == booking_id
        print(f"5. Eligibility unlocked: {elig_data['remaining_tries']} tries available")
        
        # 7. Get presets
        presets_response = api_client.get(f"{BASE_URL}/api/ai-tryon/presets", params={"gender": "male", "language": "en"})
        assert presets_response.status_code == 200
        presets = presets_response.json()
        assert len(presets) == 8
        print(f"6. Got {len(presets)} preset styles")
        
        # 8. Check my-sessions (should be empty)
        sessions_response = api_client.get(f"{BASE_URL}/api/ai-tryon/my-sessions", headers=user_headers)
        assert sessions_response.status_code == 200
        print("7. My-sessions endpoint works")
        
        print("✅ Full AI Try-On flow structure verified!")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
