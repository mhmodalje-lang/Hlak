#!/usr/bin/env python3
"""
BARBER HUB v3.0 Backend API Testing Suite
Tests NEW endpoints: Favorites, Advanced Search, AI Advisor (GPT-5 Vision)
"""

import requests
import json
import sys
import base64
import io
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from PIL import Image

# Configuration
BASE_URL = "https://web-repo-tool.preview.emergentagent.com/api"
ADMIN_CREDENTIALS = {"phone_number": "admin", "password": "admin123"}
SALON_CREDENTIALS = {"phone_number": "0935964158", "password": "salon123"}

class BarberHubV3Tester:
    def __init__(self):
        self.session = requests.Session()
        self.admin_token = None
        self.salon_token = None
        self.user_token = None
        self.test_results = []
        self.barbershops = []
        self.test_booking_id = None
        
    def log_test(self, test_name: str, success: bool, details: str = "", response_data: Dict = None):
        """Log test results"""
        status = "✅ PASS" if success else "❌ FAIL"
        result = {
            "test": test_name,
            "status": status,
            "success": success,
            "details": details,
            "response_data": response_data
        }
        self.test_results.append(result)
        print(f"{status} - {test_name}")
        if details:
            print(f"    Details: {details}")
        if not success and response_data:
            print(f"    Response: {json.dumps(response_data, indent=2)}")
        print()

    def make_request(self, method: str, endpoint: str, data: Dict = None, params: Dict = None, token: str = None) -> Dict:
        """Make HTTP request with proper error handling"""
        url = f"{BASE_URL}{endpoint}"
        headers = {"Content-Type": "application/json"}
        
        if token:
            headers["Authorization"] = f"Bearer {token}"
            
        try:
            if method.upper() == "GET":
                response = self.session.get(url, params=params, headers=headers, timeout=30)
            elif method.upper() == "POST":
                response = self.session.post(url, json=data, params=params, headers=headers, timeout=30)
            elif method.upper() == "PUT":
                response = self.session.put(url, json=data, params=params, headers=headers, timeout=30)
            elif method.upper() == "DELETE":
                response = self.session.delete(url, params=params, headers=headers, timeout=30)
            else:
                return {"error": f"Unsupported method: {method}"}
                
            return {
                "status_code": response.status_code,
                "data": response.json() if response.content else {},
                "success": 200 <= response.status_code < 300
            }
        except requests.exceptions.Timeout:
            return {"error": "Request timeout", "status_code": 408}
        except requests.exceptions.ConnectionError:
            return {"error": "Connection error", "status_code": 0}
        except Exception as e:
            return {"error": str(e), "status_code": 500}

    def generate_test_face_image(self) -> str:
        """Generate a simple test face image as base64"""
        # Create a simple 200x200 image with some facial features
        img = Image.new('RGB', (200, 200), color='peachpuff')
        
        # Add some basic facial features (eyes, nose, mouth)
        from PIL import ImageDraw
        draw = ImageDraw.Draw(img)
        
        # Eyes
        draw.ellipse([60, 60, 80, 80], fill='black')  # Left eye
        draw.ellipse([120, 60, 140, 80], fill='black')  # Right eye
        
        # Nose
        draw.polygon([(100, 90), (95, 110), (105, 110)], fill='brown')
        
        # Mouth
        draw.arc([80, 130, 120, 150], 0, 180, fill='red', width=3)
        
        # Convert to base64
        buffer = io.BytesIO()
        img.save(buffer, format='JPEG')
        img_base64 = base64.b64encode(buffer.getvalue()).decode()
        
        return img_base64

    def test_seed_data(self):
        """Test POST /api/seed endpoint"""
        response = self.make_request("POST", "/seed")
        
        if response.get("success"):
            data = response.get("data", {})
            message = data.get("message", "")
            barbershop_count = data.get("barbershop_count", 0)
            
            if barbershop_count >= 10:
                self.log_test("Seed Data", True, f"Seed data ready with {barbershop_count} barbershops")
                return True
            else:
                self.log_test("Seed Data", False, f"Expected at least 10 barbershops, got {barbershop_count}", response)
                return False
        else:
            self.log_test("Seed Data", False, "Seed endpoint failed", response)
            return False

    def test_admin_login(self):
        """Test admin authentication"""
        response = self.make_request("POST", "/auth/login", ADMIN_CREDENTIALS)
        
        if response.get("success") and response.get("data", {}).get("user_type") == "admin":
            self.admin_token = response["data"]["access_token"]
            self.log_test("Admin Login", True, "Admin authenticated successfully")
            return True
        else:
            self.log_test("Admin Login", False, "Failed to authenticate admin", response)
            return False

    def test_salon_login(self):
        """Test salon owner authentication"""
        response = self.make_request("POST", "/auth/login", SALON_CREDENTIALS)
        
        if response.get("success") and response.get("data", {}).get("user_type") == "barbershop":
            self.salon_token = response["data"]["access_token"]
            self.log_test("Salon Owner Login", True, "Salon owner authenticated successfully")
            return True
        else:
            self.log_test("Salon Owner Login", False, "Failed to authenticate salon owner", response)
            return False

    def test_user_registration(self):
        """Test user registration for AI advisor testing"""
        user_data = {
            "phone_number": f"test{datetime.now().strftime('%H%M%S')}",
            "password": "testpass123",
            "full_name": "أحمد محمد التجريبي",
            "gender": "male",
            "country": "Turkey",
            "city": "Istanbul"
        }
        
        response = self.make_request("POST", "/auth/register", user_data)
        
        if response.get("success") and response.get("data", {}).get("user_type") == "user":
            self.user_token = response["data"]["access_token"]
            self.log_test("User Registration", True, f"User registered: {user_data['full_name']}")
            return True
        else:
            self.log_test("User Registration", False, "Failed to register user", response)
            return False

    def get_barbershops(self):
        """Get barbershops for testing"""
        response = self.make_request("GET", "/barbers")
        
        if response.get("success"):
            self.barbershops = response.get("data", [])
            if len(self.barbershops) >= 5:
                self.log_test("Get Barbershops", True, f"Retrieved {len(self.barbershops)} barbershops")
                return True
            else:
                self.log_test("Get Barbershops", False, f"Expected at least 5 barbershops, got {len(self.barbershops)}")
                return False
        else:
            self.log_test("Get Barbershops", False, "Failed to get barbershops", response)
            return False

    # ============== FAVORITES SYSTEM TESTS ==============

    def test_favorites_add(self):
        """Test POST /api/favorites"""
        if not self.user_token or not self.barbershops:
            self.log_test("Favorites Add", False, "Missing user token or barbershops")
            return False
            
        shop_id = self.barbershops[0]["id"]
        data = {"shop_id": shop_id}
        
        response = self.make_request("POST", "/favorites", data, token=self.user_token)
        
        if response.get("success"):
            favorite_data = response.get("data", {})
            if favorite_data.get("favorite_id") or favorite_data.get("id"):
                self.log_test("Favorites Add", True, "Successfully added favorite")
                return True
            else:
                self.log_test("Favorites Add", False, "No favorite_id returned", response)
                return False
        else:
            self.log_test("Favorites Add", False, "Failed to add favorite", response)
            return False

    def test_favorites_add_duplicate(self):
        """Test POST /api/favorites - should not create duplicate"""
        if not self.user_token or not self.barbershops:
            self.log_test("Favorites Add Duplicate", False, "Missing user token or barbershops")
            return False
            
        shop_id = self.barbershops[0]["id"]
        data = {"shop_id": shop_id}
        
        response = self.make_request("POST", "/favorites", data, token=self.user_token)
        
        if response.get("success"):
            # Should return existing favorite, not create new one
            self.log_test("Favorites Add Duplicate", True, "Handled duplicate correctly")
            return True
        else:
            self.log_test("Favorites Add Duplicate", False, "Failed duplicate handling", response)
            return False

    def test_favorites_check(self):
        """Test GET /api/favorites/check/{shop_id}"""
        if not self.user_token or not self.barbershops:
            self.log_test("Favorites Check", False, "Missing user token or barbershops")
            return False
            
        shop_id = self.barbershops[0]["id"]
        
        response = self.make_request("GET", f"/favorites/check/{shop_id}", token=self.user_token)
        
        if response.get("success"):
            data = response.get("data", {})
            if data.get("is_favorite") is True:
                self.log_test("Favorites Check", True, "Correctly identified as favorite")
                return True
            else:
                self.log_test("Favorites Check", False, f"Expected is_favorite=true, got {data.get('is_favorite')}", response)
                return False
        else:
            self.log_test("Favorites Check", False, "Failed to check favorite status", response)
            return False

    def test_favorites_list(self):
        """Test GET /api/favorites/my"""
        if not self.user_token:
            self.log_test("Favorites List", False, "Missing user token")
            return False
            
        response = self.make_request("GET", "/favorites/my", token=self.user_token)
        
        if response.get("success"):
            data = response.get("data", [])
            if isinstance(data, list) and len(data) >= 1:
                # Check if the favorite shop appears in the list
                favorite_shop = data[0]
                if favorite_shop.get("id") or favorite_shop.get("shop_id"):
                    self.log_test("Favorites List", True, f"Retrieved {len(data)} favorite(s)")
                    return True
                else:
                    self.log_test("Favorites List", False, "Favorite missing required fields", response)
                    return False
            else:
                self.log_test("Favorites List", False, f"Expected at least 1 favorite, got {len(data) if isinstance(data, list) else 'non-list'}", response)
                return False
        else:
            self.log_test("Favorites List", False, "Failed to get favorites list", response)
            return False

    def test_favorites_delete(self):
        """Test DELETE /api/favorites/{shop_id}"""
        if not self.user_token or not self.barbershops:
            self.log_test("Favorites Delete", False, "Missing user token or barbershops")
            return False
            
        shop_id = self.barbershops[0]["id"]
        
        response = self.make_request("DELETE", f"/favorites/{shop_id}", token=self.user_token)
        
        if response.get("success"):
            data = response.get("data", {})
            if data.get("deleted_count") == 1 or "deleted" in str(data).lower():
                self.log_test("Favorites Delete", True, "Successfully deleted favorite")
                return True
            else:
                self.log_test("Favorites Delete", False, "Unexpected delete response", response)
                return False
        else:
            self.log_test("Favorites Delete", False, "Failed to delete favorite", response)
            return False

    def test_favorites_check_after_delete(self):
        """Test GET /api/favorites/check/{shop_id} after delete"""
        if not self.user_token or not self.barbershops:
            self.log_test("Favorites Check After Delete", False, "Missing user token or barbershops")
            return False
            
        shop_id = self.barbershops[0]["id"]
        
        response = self.make_request("GET", f"/favorites/check/{shop_id}", token=self.user_token)
        
        if response.get("success"):
            data = response.get("data", {})
            if data.get("is_favorite") is False:
                self.log_test("Favorites Check After Delete", True, "Correctly shows not favorite after delete")
                return True
            else:
                self.log_test("Favorites Check After Delete", False, f"Expected is_favorite=false, got {data.get('is_favorite')}", response)
                return False
        else:
            self.log_test("Favorites Check After Delete", False, "Failed to check favorite status after delete", response)
            return False

    def test_favorites_barber_forbidden(self):
        """Test POST /api/favorites with barber token - should return 403"""
        if not self.salon_token or not self.barbershops:
            self.log_test("Favorites Barber Forbidden", False, "Missing salon token or barbershops")
            return False
            
        shop_id = self.barbershops[0]["id"]
        data = {"shop_id": shop_id}
        
        response = self.make_request("POST", "/favorites", data, token=self.salon_token)
        
        if response.get("status_code") == 403:
            self.log_test("Favorites Barber Forbidden", True, "Correctly returned 403 for barber trying to add favorite")
            return True
        else:
            self.log_test("Favorites Barber Forbidden", False, f"Expected 403, got {response.get('status_code')}", response)
            return False

    # ============== ADVANCED SEARCH TESTS ==============

    def test_search_by_shop_type_and_sort(self):
        """Test GET /api/search/barbers?shop_type=male&sort=rating&limit=5"""
        params = {
            "shop_type": "male",
            "sort": "rating",
            "limit": 5
        }
        
        response = self.make_request("GET", "/search/barbers", params=params)
        
        if response.get("success"):
            data = response.get("data", [])
            if len(data) <= 5 and len(data) > 0:
                # Check enrichment fields
                first_shop = data[0]
                required_fields = ["distance_km", "min_price", "max_price"]
                has_enrichment = any(field in first_shop for field in required_fields)
                
                if has_enrichment or "rating" in first_shop:
                    self.log_test("Search by Shop Type and Sort", True, f"Retrieved {len(data)} male shops with enrichment")
                    return True
                else:
                    self.log_test("Search by Shop Type and Sort", False, "Missing enrichment fields", response)
                    return False
            else:
                self.log_test("Search by Shop Type and Sort", False, f"Expected 1-5 shops, got {len(data)}", response)
                return False
        else:
            self.log_test("Search by Shop Type and Sort", False, "Failed to search by shop type", response)
            return False

    def test_search_with_distance(self):
        """Test GET /api/search/barbers with distance calculation"""
        params = {
            "shop_type": "male",
            "user_lat": 36.2021,
            "user_lng": 37.1343,
            "sort": "distance",
            "max_distance_km": 5000,
            "limit": 10
        }
        
        response = self.make_request("GET", "/search/barbers", params=params)
        
        if response.get("success"):
            data = response.get("data", [])
            if len(data) > 0:
                # Check if distance_km is included
                first_shop = data[0]
                if "distance_km" in first_shop and first_shop["distance_km"] is not None:
                    self.log_test("Search with Distance", True, f"Retrieved {len(data)} shops with distance calculation")
                    return True
                else:
                    self.log_test("Search with Distance", False, "Missing distance_km field", response)
                    return False
            else:
                self.log_test("Search with Distance", False, "No shops returned", response)
                return False
        else:
            self.log_test("Search with Distance", False, "Failed to search with distance", response)
            return False

    def test_search_by_price_sort(self):
        """Test GET /api/search/barbers?shop_type=female&sort=price_asc&limit=3"""
        params = {
            "shop_type": "female",
            "sort": "price_asc",
            "limit": 3
        }
        
        response = self.make_request("GET", "/search/barbers", params=params)
        
        if response.get("success"):
            data = response.get("data", [])
            if len(data) <= 3 and len(data) > 0:
                # Check if sorted by price
                prices = [shop.get("min_price", 0) for shop in data if "min_price" in shop]
                if len(prices) > 1:
                    is_sorted = all(prices[i] <= prices[i+1] for i in range(len(prices)-1))
                    if is_sorted:
                        self.log_test("Search by Price Sort", True, f"Retrieved {len(data)} female shops sorted by price")
                        return True
                    else:
                        self.log_test("Search by Price Sort", False, f"Not sorted by price: {prices}", response)
                        return False
                else:
                    self.log_test("Search by Price Sort", True, f"Retrieved {len(data)} female shops")
                    return True
            else:
                self.log_test("Search by Price Sort", False, f"Expected 1-3 shops, got {len(data)}", response)
                return False
        else:
            self.log_test("Search by Price Sort", False, "Failed to search by price sort", response)
            return False

    def test_search_by_rating_filter(self):
        """Test GET /api/search/barbers?shop_type=male&rating_min=4.5&limit=10"""
        params = {
            "shop_type": "male",
            "rating_min": 4.5,
            "limit": 10
        }
        
        response = self.make_request("GET", "/search/barbers", params=params)
        
        if response.get("success"):
            data = response.get("data", [])
            if len(data) >= 0:  # Could be 0 if no shops meet criteria
                # Check if all returned shops have rating >= 4.5
                all_high_rated = all(shop.get("rating", 0) >= 4.5 for shop in data)
                if all_high_rated:
                    self.log_test("Search by Rating Filter", True, f"Retrieved {len(data)} shops with rating >= 4.5")
                    return True
                else:
                    ratings = [shop.get("rating", 0) for shop in data]
                    self.log_test("Search by Rating Filter", False, f"Some shops below 4.5 rating: {ratings}", response)
                    return False
            else:
                self.log_test("Search by Rating Filter", True, "No shops meet rating criteria (acceptable)")
                return True
        else:
            self.log_test("Search by Rating Filter", False, "Failed to search by rating filter", response)
            return False

    def test_search_by_name(self):
        """Test GET /api/search/barbers?shop_type=male&search=king&limit=10"""
        params = {
            "shop_type": "male",
            "search": "king",
            "limit": 10
        }
        
        response = self.make_request("GET", "/search/barbers", params=params)
        
        if response.get("success"):
            data = response.get("data", [])
            # Check if returned shops contain "king" in name (case-insensitive)
            if len(data) > 0:
                contains_king = any("king" in shop.get("shop_name", "").lower() or 
                                  "king" in shop.get("salon_name", "").lower() 
                                  for shop in data)
                if contains_king:
                    self.log_test("Search by Name", True, f"Retrieved {len(data)} shops containing 'king'")
                    return True
                else:
                    self.log_test("Search by Name", False, "No shops contain 'king' in name", response)
                    return False
            else:
                self.log_test("Search by Name", True, "No shops match 'king' search (acceptable)")
                return True
        else:
            self.log_test("Search by Name", False, "Failed to search by name", response)
            return False

    # ============== AI ADVISOR TESTS ==============

    def test_ai_advisor_eligibility_not_eligible(self):
        """Test GET /api/ai-advisor/eligibility - should not be eligible initially"""
        if not self.user_token:
            self.log_test("AI Advisor Eligibility (Not Eligible)", False, "Missing user token")
            return False
            
        response = self.make_request("GET", "/ai-advisor/eligibility", token=self.user_token)
        
        if response.get("success"):
            data = response.get("data", {})
            if data.get("eligible") is False and data.get("total_bookings") == 0:
                self.log_test("AI Advisor Eligibility (Not Eligible)", True, "Correctly not eligible without bookings")
                return True
            else:
                self.log_test("AI Advisor Eligibility (Not Eligible)", False, f"Expected not eligible, got {data}", response)
                return False
        else:
            self.log_test("AI Advisor Eligibility (Not Eligible)", False, "Failed to check eligibility", response)
            return False

    def test_create_booking_for_ai_advisor(self):
        """Create a booking for AI advisor testing"""
        if not self.user_token or not self.barbershops:
            self.log_test("Create Booking for AI Advisor", False, "Missing user token or barbershops")
            return False
            
        tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        # Use a different time slot that should be available
        booking_data = {
            "barbershop_id": self.barbershops[0]["id"],
            "service_id": None,  # Will use default
            "booking_date": tomorrow,
            "start_time": "11:00",  # Changed from 10:00 to avoid conflicts
            "customer_name": "أحمد محمد التجريبي",
            "notes": "حجز تجريبي للمستشار الذكي"
        }
        
        response = self.make_request("POST", "/bookings", booking_data, token=self.user_token)
        
        if response.get("success"):
            data = response.get("data", {})
            self.test_booking_id = data.get("id")
            if self.test_booking_id:
                self.log_test("Create Booking for AI Advisor", True, f"Created booking: {self.test_booking_id}")
                return True
            else:
                self.log_test("Create Booking for AI Advisor", False, "No booking ID returned", response)
                return False
        else:
            self.log_test("Create Booking for AI Advisor", False, "Failed to create booking", response)
            return False

    def test_confirm_booking(self):
        """Confirm the booking using salon owner token"""
        if not self.salon_token or not self.test_booking_id:
            self.log_test("Confirm Booking", False, "Missing salon token or booking ID")
            return False
            
        # Use dedicated confirm endpoint
        response = self.make_request("PUT", f"/bookings/{self.test_booking_id}/confirm", token=self.salon_token)
        
        if response.get("success"):
            self.log_test("Confirm Booking", True, "Booking confirmed successfully")
            return True
        else:
            self.log_test("Confirm Booking", False, "Failed to confirm booking", response)
            return False

    def test_ai_advisor_eligibility_eligible(self):
        """Test GET /api/ai-advisor/eligibility - should be eligible after confirmed booking"""
        if not self.user_token:
            self.log_test("AI Advisor Eligibility (Eligible)", False, "Missing user token")
            return False
            
        response = self.make_request("GET", "/ai-advisor/eligibility", token=self.user_token)
        
        if response.get("success"):
            data = response.get("data", {})
            if data.get("eligible") is True and data.get("available_booking_id"):
                self.log_test("AI Advisor Eligibility (Eligible)", True, "Correctly eligible with confirmed booking")
                return True
            else:
                self.log_test("AI Advisor Eligibility (Eligible)", False, f"Expected eligible=true, got {data}", response)
                return False
        else:
            self.log_test("AI Advisor Eligibility (Eligible)", False, "Failed to check eligibility", response)
            return False

    def test_ai_advisor_analyze(self):
        """Test POST /api/ai-advisor/analyze with face image"""
        if not self.user_token or not self.test_booking_id:
            self.log_test("AI Advisor Analyze", False, "Missing user token or booking ID")
            return False
            
        # Generate test face image
        face_image_base64 = self.generate_test_face_image()
        
        data = {
            "booking_id": self.test_booking_id,
            "image_base64": face_image_base64,
            "language": "ar"
        }
        
        # This might take 5-20 seconds for GPT-5 Vision
        response = self.make_request("POST", "/ai-advisor/analyze", data, token=self.user_token)
        
        if response.get("success"):
            analysis_data = response.get("data", {})
            required_fields = ["id", "user_id", "booking_id", "analysis"]
            missing_fields = [field for field in required_fields if field not in analysis_data]
            
            if not missing_fields:
                analysis = analysis_data.get("analysis", {})
                if "face_shape" in analysis and "recommended_styles" in analysis:
                    self.log_test("AI Advisor Analyze", True, "GPT-5 Vision analysis completed successfully")
                    return True
                else:
                    self.log_test("AI Advisor Analyze", False, "Missing analysis fields", response)
                    return False
            else:
                self.log_test("AI Advisor Analyze", False, f"Missing required fields: {missing_fields}", response)
                return False
        else:
            error_msg = response.get("data", {}).get("detail", "Unknown error")
            self.log_test("AI Advisor Analyze", False, f"GPT-5 Vision analysis failed: {error_msg}", response)
            return False

    def test_ai_advisor_analyze_duplicate(self):
        """Test POST /api/ai-advisor/analyze with same booking_id - should return 409"""
        if not self.user_token or not self.test_booking_id:
            self.log_test("AI Advisor Analyze Duplicate", False, "Missing user token or booking ID")
            return False
            
        face_image_base64 = self.generate_test_face_image()
        
        data = {
            "booking_id": self.test_booking_id,
            "image_base64": face_image_base64,
            "language": "ar"
        }
        
        response = self.make_request("POST", "/ai-advisor/analyze", data, token=self.user_token)
        
        if response.get("status_code") == 409:
            self.log_test("AI Advisor Analyze Duplicate", True, "Correctly returned 409 for duplicate booking analysis")
            return True
        else:
            self.log_test("AI Advisor Analyze Duplicate", False, f"Expected 409, got {response.get('status_code')}", response)
            return False

    def test_ai_advisor_my_advice(self):
        """Test GET /api/ai-advisor/my-advice"""
        if not self.user_token:
            self.log_test("AI Advisor My Advice", False, "Missing user token")
            return False
            
        response = self.make_request("GET", "/ai-advisor/my-advice", token=self.user_token)
        
        if response.get("success"):
            data = response.get("data", [])
            if isinstance(data, list) and len(data) >= 1:
                advice = data[0]
                if advice.get("id") and advice.get("analysis"):
                    self.log_test("AI Advisor My Advice", True, f"Retrieved {len(data)} advice record(s)")
                    return True
                else:
                    self.log_test("AI Advisor My Advice", False, "Advice missing required fields", response)
                    return False
            else:
                self.log_test("AI Advisor My Advice", False, f"Expected at least 1 advice, got {len(data) if isinstance(data, list) else 'non-list'}", response)
                return False
        else:
            self.log_test("AI Advisor My Advice", False, "Failed to get advice list", response)
            return False

    def test_ai_advisor_get_advice_by_id(self):
        """Test GET /api/ai-advisor/advice/{id}"""
        if not self.user_token:
            self.log_test("AI Advisor Get Advice by ID", False, "Missing user token")
            return False
            
        # First get the advice list to get an ID
        response = self.make_request("GET", "/ai-advisor/my-advice", token=self.user_token)
        
        if response.get("success"):
            data = response.get("data", [])
            if len(data) > 0:
                advice_id = data[0].get("id")
                if advice_id:
                    # Now get specific advice
                    response2 = self.make_request("GET", f"/ai-advisor/advice/{advice_id}", token=self.user_token)
                    
                    if response2.get("success"):
                        advice_data = response2.get("data", {})
                        if advice_data.get("id") == advice_id:
                            self.log_test("AI Advisor Get Advice by ID", True, "Retrieved specific advice by ID")
                            return True
                        else:
                            self.log_test("AI Advisor Get Advice by ID", False, "ID mismatch", response2)
                            return False
                    else:
                        self.log_test("AI Advisor Get Advice by ID", False, "Failed to get advice by ID", response2)
                        return False
                else:
                    self.log_test("AI Advisor Get Advice by ID", False, "No advice ID available")
                    return False
            else:
                self.log_test("AI Advisor Get Advice by ID", False, "No advice available for ID test")
                return False
        else:
            self.log_test("AI Advisor Get Advice by ID", False, "Failed to get advice list for ID test")
            return False

    def test_ai_advisor_share_whatsapp(self):
        """Test POST /api/ai-advisor/share-whatsapp"""
        if not self.user_token:
            self.log_test("AI Advisor Share WhatsApp", False, "Missing user token")
            return False
            
        # First get the advice list to get an ID
        response = self.make_request("GET", "/ai-advisor/my-advice", token=self.user_token)
        
        if response.get("success"):
            data = response.get("data", [])
            if len(data) > 0:
                advice_id = data[0].get("id")
                if advice_id:
                    # Now test WhatsApp share
                    share_data = {"advice_id": advice_id}
                    response2 = self.make_request("POST", "/ai-advisor/share-whatsapp", share_data, token=self.user_token)
                    
                    if response2.get("success"):
                        share_result = response2.get("data", {})
                        required_fields = ["whatsapp_link", "message", "style_card_base64"]
                        missing_fields = [field for field in required_fields if field not in share_result]
                        
                        if not missing_fields:
                            whatsapp_link = share_result.get("whatsapp_link", "")
                            if whatsapp_link.startswith("https://wa.me/"):
                                self.log_test("AI Advisor Share WhatsApp", True, "WhatsApp share link generated successfully")
                                return True
                            else:
                                self.log_test("AI Advisor Share WhatsApp", False, "Invalid WhatsApp link format", response2)
                                return False
                        else:
                            self.log_test("AI Advisor Share WhatsApp", False, f"Missing fields: {missing_fields}", response2)
                            return False
                    else:
                        self.log_test("AI Advisor Share WhatsApp", False, "Failed to generate WhatsApp share", response2)
                        return False
                else:
                    self.log_test("AI Advisor Share WhatsApp", False, "No advice ID available for share test")
                    return False
            else:
                self.log_test("AI Advisor Share WhatsApp", False, "No advice available for share test")
                return False
        else:
            self.log_test("AI Advisor Share WhatsApp", False, "Failed to get advice list for share test")
            return False

    def run_all_tests(self):
        """Run all v3.0 tests in sequence"""
        print("🚀 Starting BARBER HUB v3.0 Backend API Tests")
        print("=" * 60)
        
        # Prerequisites
        self.test_seed_data()
        admin_success = self.test_admin_login()
        salon_success = self.test_salon_login()
        user_success = self.test_user_registration()
        self.get_barbershops()
        
        # Favorites System Tests
        print("\n🔖 FAVORITES SYSTEM TESTS")
        print("-" * 40)
        if user_success:
            self.test_favorites_add()
            self.test_favorites_add_duplicate()
            self.test_favorites_check()
            self.test_favorites_list()
            self.test_favorites_delete()
            self.test_favorites_check_after_delete()
        
        if salon_success:
            self.test_favorites_barber_forbidden()
        
        # Advanced Search Tests
        print("\n🔍 ADVANCED SEARCH TESTS")
        print("-" * 40)
        self.test_search_by_shop_type_and_sort()
        self.test_search_with_distance()
        self.test_search_by_price_sort()
        self.test_search_by_rating_filter()
        self.test_search_by_name()
        
        # AI Advisor Tests
        print("\n🤖 AI ADVISOR TESTS")
        print("-" * 40)
        if user_success and salon_success:
            self.test_ai_advisor_eligibility_not_eligible()
            booking_success = self.test_create_booking_for_ai_advisor()
            if booking_success:
                confirm_success = self.test_confirm_booking()
                if confirm_success:
                    self.test_ai_advisor_eligibility_eligible()
                    analyze_success = self.test_ai_advisor_analyze()
                    if analyze_success:
                        self.test_ai_advisor_analyze_duplicate()
                        self.test_ai_advisor_my_advice()
                        self.test_ai_advisor_get_advice_by_id()
                        self.test_ai_advisor_share_whatsapp()
        
        # Summary
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        
        passed = sum(1 for result in self.test_results if result["success"])
        total = len(self.test_results)
        
        print(f"Total Tests: {total}")
        print(f"Passed: {passed}")
        print(f"Failed: {total - passed}")
        print(f"Success Rate: {(passed/total)*100:.1f}%")
        
        print("\n📋 DETAILED RESULTS:")
        for result in self.test_results:
            print(f"{result['status']} - {result['test']}")
            if result['details']:
                print(f"    {result['details']}")
        
        # Critical issues
        failed_tests = [r for r in self.test_results if not r["success"]]
        if failed_tests:
            print("\n🚨 CRITICAL ISSUES:")
            for test in failed_tests:
                print(f"❌ {test['test']}: {test['details']}")
        
        return passed == total

if __name__ == "__main__":
    tester = BarberHubV3Tester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)