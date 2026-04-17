"""
Shared pytest fixtures for BARBER HUB backend tests
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

@pytest.fixture(scope="session")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session

@pytest.fixture(scope="session")
def barber_token(api_client):
    """Get barber authentication token using seeded credentials"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "phone_number": "0935964158",
        "password": "salon123"
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip("Barber authentication failed - skipping barber tests")

@pytest.fixture(scope="session")
def barber_client(api_client, barber_token):
    """Session with barber auth header"""
    api_client.headers.update({"Authorization": f"Bearer {barber_token}"})
    return api_client

@pytest.fixture(scope="session")
def test_user_data():
    """Generate unique test user data"""
    import uuid
    unique_id = str(uuid.uuid4())[:8]
    return {
        "phone_number": f"TEST_{unique_id}",
        "password": "testpass123",
        "full_name": f"Test User {unique_id}",
        "gender": "male",
        "country": "Germany",
        "city": "Berlin"
    }
